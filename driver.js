/*global Vue, todoStorage */
(function (exports) {

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
      this.recureOn = null;
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
          });
        },
        todosDoing: function (todos) {
          return todos.filter(function (todo) {
            return todo.doing && !todo.done
          });
        },
        todosDone: function (todos) {
          return todos.filter(function (todo) {
            return todo.done && !todo.archived
          });
        },
        todosArchived: function (todos) {
          return todos.filter(function (todo) {
            return todo.archived
          });
        }
      },
      ready: function () {
        if (LocalDrive) this.todos = LocalDrive.fetch();
        this.$watch('todos', function (todos) {
          todos.sort(function (a, b) {
            return a.priority < b.priority;
          });
          if (LocalDrive) LocalDrive.save(todos);
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
        activate: function () {
          var el = this.$el;
          this.active = true;
          setTimeout(function () {
            el.getElementsByTagName('input')[0].focus();
          }, 100);
        },
        cancel: function () {
          this.newItemValue = '';
          this.active = false;
        },
        newItem: function () {
          var value = this.newItemValue && this.newItemValue.trim();
          if (value)
            this.todos.unshift(new ToDo(this.todos.length, value));
          this.newItemValue = '';
          this.active = false;
          this.$event.cancelBubble = true;
          this.$event.returnValue = false;
        },
        editItem: function (item) {
          this.editedItemData.index    = this.$data.todos.lastIndexOf(item.$data);
          this.editedItemData.content   = item.content;
          this.editedItemData.more      = item.more     || "";
          this.editedItemData.dueOn     = dateToString(item.dueOn) || "";
          this.editedItemData.recureOn  = item.recureOn || 0;
          this.editing = true;
        },
        updateItem: function () {
          var dateField = document.getElementById("itemDue");
          var item = this.$data.todos[this.editedItemData.index];
          item.content = this.editedItemData.content;
          item.more = this.editedItemData.more;
          item.dueOn = this.editedItemData.dueOn==""?null:dateField.valueAsDate;
          item.recureOn = this.editedItemData.recureOn;
          this.editing = false;
        },
        upvoteItem: function (item) {
          item.$event.cancelBubble = true;
          if (item.priority + 1 < 6) item.priority++;
        },
        downvoteItem: function (item) {
          item.$event.cancelBubble = true;
          if (item.priority - 1 > -1) item.priority--;
        },
        markDoing: function (item) {
          item.doing = true;
          item.done = false;
        },
        markDone: function (item) {
          item.doneOn = new Date();
          item.doing = false;
          if (item.recureOn == 0) item.done = true;
          else {
              item.dueOn = computeNextDueDate(item.dueOn, item.recureOn);
          }
        },
        resetItem: function (item) {
          item.$event.cancelBubble = true;
          item.doneOn = null;
          item.archived = false;
          item.doing = false;
          item.done = false;
        },
        archiveItem: function (item) {
          item.$event.cancelBubble = true;
          item.archived = true;
        },
        removeItem: function (item) {
          item.$event.cancelBubble = true;
          this.todos.$remove(item.$data);
        },
        isDueOn: function(item) {
            return item.dueOn != null && item.recureOn == 0;
        },
        isDue: function(item) {
            if (item.dueOn == null) return false;
            var then = new Date(item.dueOn),
                now = new Date();
            return then <= now;
        },
        isPastDue: function(item) {
            if (item.dueOn == null) return false;
            var then = new Date(item.dueOn),
                now = new Date();
            return then < now;
        }
      }
    });
})(window);