/*global Vue, todoStorage */
(function (exports) {
    
  var STORAGE_KEY = 'debug-todo-store';

  var ToDo = function (id, content) {
      this.id = id;
      this.content = content;
      this.more = null,
      this.doing = false;
      this.done = false;
      this.archived = false;
      this.priority = 0;
      this.addedOn = new Date();
      this.dueOn = null;
      this.doneOn = null;
      this.recureOn = 0;
      this.tags = [];
    };
    
  function refreshDueDates(instance){
      var now = new Date(),
          next = new Date(),
          timeout = 0;
      next.setDate(next.getDate()+1);
      next.setHours(0);
      next.setMinutes(0);
      next.setSeconds(0);
      timeout = next - now;
      
      instance.todos.forEach(function(item){
            if (item.dueOn == null) return;
            var then = new Date(item.dueOn),
                now = new Date();
            if (then <= now) item.doing = true;
      });
      
      setTimeout( function(){ refreshDueDates(instance); }, timeout );
  }
    
  function dateToString(date){
      if (date == null) return;
      if (typeof(date) != "object") date = new Date(date);
      return date?date.toISOString().substring(0, 10):"";
  }
    
  function computeNextDueDate(currentDueDate, recurance){
      var dueDate = new Date(currentDueDate) || new Date();
      switch (recurance*1) {
              case 1:
                dueDate.setDate(dueDate.getDate()+1);
              break;
              case 2:
                dueDate.setDate(dueDate.getDate()+7);
              break;
              case 3:
                dueDate.setMonth(dueDate.getMonth()+1);
              break;
              case 4:
                dueDate.setFullYear(dueDate.getFullYear()+1);
              break;
      }
      return dueDate;
  }
    
  Vue.component('todo-item', {
      template: '#template-todo-item',
      replace: 'true',
      computed: {
        hasDueOn: function() {
            return this.dueOn != null && this.recureOn == 0;
        },
        isQued: function() {return !this.doing&&!this.done&&!this.archived},
        isDoing: function() {return this.doing&&!this.done&&!this.archived},
        isDone: function() {return !this.doing&&this.done&&!this.archived},
        isDue: function() {
            if (this.dueOn == null) return false;
            var then = new Date(this.dueOn),
                now = new Date();
            return then == now;
        },
        isPastDue: function() {
            if (this.dueOn == null) return false;
            var then = new Date(this.dueOn),
                now = new Date();
            return then < now;
        }
      },
      methods: {
        upvote: function (e) {
          e.cancelBubble = true;
          if (this.priority + 1 < 6) this.priority++;
        },
        downvote: function (e) {
          e.cancelBubble = true;
          if (this.priority - 1 > -1) this.priority--;
        },
        markDo: function (e) {
            e.cancelBubble = true;
            if(this.archived) return;
            if(!this.doing&&!this.done){
              this.doing = true;
              this.done = false;
            }else if(this.doing&&!this.done){
              this.doneOn = new Date();
              this.doing = false;
              if (this.recureOn == 0) this.done = true;
              else {
                  this.dueOn = computeNextDueDate(this.dueOn, this.recureOn);
              }                
            }else if(!this.doing&&this.done){
              this.doneOn = null;
              this.archived = false;
              this.doing = false;
              this.done = false;
            }
        },
        archive: function (e) {
            e.cancelBubble = true;
            this.archived = true;
        },
        remove: function (e) {
            e.cancelBubble = true;
//          this.$remove(this);
        }
      }
  });
    
//  Vue.component('todo-table', {
//      template: '#template-table',
//      replace: 'true',      
//      computed: {
//        isDueOn: function() {
//            return item.dueOn != null && item.recureOn == 0;
//        },
//        isDue: function(item) {
//            if (item.dueOn == null) return false;
//            var then = new Date(item.dueOn),
//                now = new Date();
//            return then <= now;
//        },
//        isPastDue: function(item) {
//            if (item.dueOn == null) return false;
//            var then = new Date(item.dueOn),
//                now = new Date();
//            return then < now;
//        }
//      },
//      methods: {
//          
//      }
//  };
  
  var ToDos = new Vue({
      el: '#toDoList',
      data: {
        title: 'Doing',
        active: false,
        editing: false,
        newItemValue: "",
        editedItemData: {
              index: null,
              content: "",
              more: "",
              dueOn: "",
              recureOn: 0
          },
        todos: []
      },
      filters: {
        todosQued: function (todos) {
          return todos.filter(function (todo) {
            return !todo.done && !todo.doing
          }).sort(function (a, b) {
            return a.priority < b.priority;
          });
        },
        todosDoing: function (todos) {
          return todos.filter(function (todo) {
            return todo.doing && !todo.done
          }).sort(function (a, b) {
            return a.priority < b.priority;
          });
        },
        todosDone: function (todos) {
          return todos.filter(function (todo) {
            return todo.done && !todo.archived
          }).sort(function (a, b) {
            return a.doneOn < b.doneOn;
          });
        },
        todosArchived: function (todos) {
          return todos.filter(function (todo) {
            return todo.archived
          }).sort(function (a, b) {
            return a.doneOn < b.doneOn;
          });
        }
      },
      ready: function () {
        if (LocalDrive) this.todos = LocalDrive.fetch(STORAGE_KEY);
        this.$watch('todos', function (todos) {
//          todos.sort(function (a, b) {
//            return a.done?false : a.priority < b.priority;
//          });
          if (LocalDrive) LocalDrive.save(STORAGE_KEY, todos);
        }, true);
          refreshDueDates(this);
      },
      computed: {
        totalItems: function () {
          return this.todos.length;
        },
        doingItems: function () {
          return this.todos.filter(function (item) {
            return item.doing && !item.done;
          }).length;
        },
        remainingItems: function () {
          return this.todos.filter(function (item) {
            return !item.done;
          }).length;
        },
        doneItems: function () {
          return this.todos.filter(function (item) {
            return item.done && !item.archived;
          }).length;
        },
        archivedItems: function () {
          return this.todos.filter(function (item) {
            return item.archived;
          }).length;
        }
      },
      methods: {
        onNewItemClicked: function () {
          var el = this.$el;
          this.active = true;
          setTimeout(function () {
            el.getElementsByTagName('input')[0].focus();
          }, 100);
        },
        onNewItemCancelled: function () {
          this.newItemValue = '';
          this.active = false;
        },
        createNewItem: function () {
          var value = this.newItemValue && this.newItemValue.trim();
          if (value)
            this.todos.unshift(new ToDo(this.todos.length, value));
          this.newItemValue = '';
          this.active = false;
          this.$event.cancelBubble = true;
          this.$event.returnValue = false;
        },
        onEditItemClicked: function (item) {
          this.editedItemData.index    = this.$data.todos.lastIndexOf(item.$data);
          this.editedItemData.content   = item.content;
          this.editedItemData.more      = item.more     || "";
          this.editedItemData.dueOn     = dateToString(item.dueOn) || "";
          this.editedItemData.recureOn  = item.recureOn || 0;
          this.editing = true;
        },
        onUpdateItemClicked: function () {
          var dateField = document.getElementById("itemDue");
          var item = this.$data.todos[this.editedItemData.index];
          item.content = this.editedItemData.content;
          item.more = this.editedItemData.more;
          item.dueOn = this.editedItemData.dueOn==""?null:dateField.valueAsDate;
          item.recureOn = this.editedItemData.recureOn;
          this.editing = false;
        }
      }
    });
})(window);