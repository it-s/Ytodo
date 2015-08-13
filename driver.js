/*global Vue, todoStorage */
(function(exports) {
  'use strict';

  var STORAGE_KEY = '-todo-store',
	STORAGE_STORE = 'debug',
	ToDo, app;

  //    var STORAGE_MODEL = [{field:"id",type:"integer"},{field:"content",type:"string"},{field:"more",type:"string"},{field:"doing",type:"bool"},{field:"done",type:"bool"},{field:"archived",type:"bool"},{field:"priority",type:"integer"},{field:"addedOn",type:"date"},{field:"dueOn",type:"date"},{field:"doneOn",type:"date"},{field:"recureOn",type:"integer"},{field:"tags",type:"array"}];

  /*
  * Helper functions
  *
  */
  
  function loadLocalData() {
    var vars = _.getUrlVars();
    //if (vars.hasOwnProperty('store')){
    STORAGE_STORE = vars["store"] || "YTODO";
    var keys = ['addedOn', 'dueOn', 'doneOn'];
    var data = LocalDrive.fetch(_.getStorageKey(STORAGE_STORE, STORAGE_KEY));
    data.forEach(function(item) {
      keys.forEach(function(key) {
        if (item.hasOwnProperty(key) && item[key] !== null) item[key] = moment(item[key]);
      });
    });
    return data || [];
    //}
  }

  /*
  * APP
  *
  */
  
  var ToDo = function(id, content) {
    this.id = id;
    this.content = content;
    this.more = null;
    this.doing = false;
    this.done = false;
    this.archived = false;
    this.priority = 0;
    this.addedOn = moment();
    this.dueOn = null;
    this.doneOn = null;
    this.recureOn = 0;
    this.tags = [];
  };
  
  app = new Vue({
    el: '#toDoList',
    data: {
	  scroll: 0,
      options: {
        sections: {
          doing: {
            show: true,
            sortBy: "priority",
            sortOrder: 1
          },
          todo: {
            show: true,
            sortBy: "priority",
            sortOrder: 1
          },
          done: {
            show: true,
            sortBy: "doneOn",
            sortOrder: 1
          },
          archived: {
            show: false,
            sortBy: "doneOn",
            sortOrder: 1
          }
        },
        archiveAfter: "month",
        deleteAfter: "month"
      },
      todos: []
    },
    filters: {
      todosQued: function(todos) {
        return todos.filter(function(todo) {
          return !todo.archived && !todo.doing && !todo.done
        }).sort(function(a, b) {
          return Number(a.priority) < Number(b.priority);
        });
      },
      todosDoing: function(todos) {
        return todos.filter(function(todo) {
          return !todo.archived && todo.doing && !todo.done
        }).sort(function(a, b) {
          return Number(a.priority) < Number(b.priority);
        });
      },
      todosDone: function(todos) {
        return todos.filter(function(todo) {
          return !todo.archived && !todo.doing && todo.done
        }).sort(function(a, b) {
          return a.doneOn < b.doneOn;
        });
      },
      todosArchived: function(todos) {
        return todos.filter(function(todo) {
          return todo.archived
        }).sort(function(a, b) {
          return a.doneOn < b.doneOn;
        });
      }
    },
    computed: {
	  scrollIsAtTop: function () {
		return this.scroll < 80;
	  },
      totalItems: function() {
        return this.todos.length;
      },
      doingItems: function() {
        return this.todos.filter(function(item) {
          return item.doing && !item.done;
        }).length;
      },
      remainingItems: function() {
        return this.todos.filter(function(item) {
          return !item.done;
        }).length;
      },
      doneItems: function() {
        return this.todos.filter(function(item) {
          return item.done && !item.archived;
        }).length;
      },
      archivedItems: function() {
        return this.todos.filter(function(item) {
          return item.archived;
        }).length;
      }
    },
    methods: {
      validateItem: function(data) {
        return (data['content'] != undefined) && (typeof(data['content']) === "string") && (data.content.trim()
          .length > 0);
      },
      addNewItem: function(data) {
        this.todos.unshift(data);
      },
      updateItem: function(data) {
        var item = this.$data.todos[data.index];
        item.content = data.content;
        item.more = data.more;
        item.dueOn = data.dueOn == "" ? null : moment(data.dueOn);
        item.recureOn = data.recureOn;
      },
	  onScroll: function(e) {
		this.scroll = e.target.scrollTop;
	  },
      onAppButtonClicked: function() {
        this.$broadcast("appmenu-show");
      },
      onAddButtonClicked: function() {
        this.$broadcast("newItemDialog-show", new ToDo(this.todos.length));
      },
      onEditItemClicked: function(item) {
        var temp = {
          index: this.$data.todos.lastIndexOf(item),
          content: item.content,
          more: item.more || "",
          dueOn: item.dueOn ? item.dueOn.format("YYYY-MM-DD") : "",
          recureOn: item.recureOn || 0
        }
        this.$broadcast("editItemDialog-show", temp);
      },
    },
    //Application entry point
    ready: function() {
      if (LocalDrive) this.todos = loadLocalData();
      this.$watch('todos', function(todos) {
        if (LocalDrive) LocalDrive.save(_.getStorageKey(STORAGE_STORE, STORAGE_KEY), todos);
      }, true);
      _.refreshDueDates(this);
    }
  });
  
})(window);
