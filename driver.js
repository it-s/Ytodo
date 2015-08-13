/*global Vue, todoStorage */
(function(exports) {
  'use strict';

  var STORAGE_KEY = '-todo-store';
  var STORAGE_STORE = 'debug';
  var ARCHIVE_AFTER = "month";

  //    var STORAGE_MODEL = [{field:"id",type:"integer"},{field:"content",type:"string"},{field:"more",type:"string"},{field:"doing",type:"bool"},{field:"done",type:"bool"},{field:"archived",type:"bool"},{field:"priority",type:"integer"},{field:"addedOn",type:"date"},{field:"dueOn",type:"date"},{field:"doneOn",type:"date"},{field:"recureOn",type:"integer"},{field:"tags",type:"array"}];

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

  function prependNodes(node, nodes) {
    for (var i = 0, n = nodes.length; i < n; i++) {
      if (nodes[i])
        node.parentNode.insertBefore(nodes[i], node);
    }
  }

  function isFunction(o) {
    return typeof(o) === "function"
  }

  function extend(a, b) {
    for (var key in b) {
      a[key] = b[key];
    }
    return a;
  }

  function getUrlVars() {
    var vars = [],
      hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  }


  function getStorageKey() {
    return STORAGE_STORE.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '-').toLowerCase() + STORAGE_KEY;
  }

  function loadLocalData() {
    var vars = getUrlVars();
    //if (vars.hasOwnProperty('store')){
    STORAGE_STORE = vars["store"] || "YTODO";
    var keys = ['addedOn', 'dueOn', 'doneOn'];
    var data = LocalDrive.fetch(getStorageKey());
    data.forEach(function(item) {
      keys.forEach(function(key) {
        if (item.hasOwnProperty(key) && item[key] !== null) item[key] = moment(item[key]);
      });
    });
    return data || [];
    //}
  }

  function refreshDueDates(instance) {
    var now = moment(),
      next = moment(),
      timeout = 0;
    next.add(1, 'hour');
    timeout = next - now;

    //Automatically promote tasks that are due
    instance.todos.forEach(function(item) {
      if (!item.done && !item.doing && item.dueOn != null && item.dueOn.isBefore(moment())) item.doing = true;
      else if (
        item.done && !item.archived && item.addedOn.isAfter(moment(), ARCHIVE_AFTER)
      ) item.archived = true;
    });

    setTimeout(function() {
      refreshDueDates(instance);
    }, timeout);
  }

  function computeNextDueDate(currentDueDate, recurance) {
    var dueDate = currentDueDate || moment();
    switch (recurance * 1) {
      case 1:
        dueDate.add(1, 'd');
        break;
      case 2:
        dueDate.add(1, 'w');
        break;
      case 3:
        dueDate.add(1, 'M');
        break;
      case 4:
        dueDate.add(1, 'y');
        break;
    }
    return dueDate;
  }

  Vue.component('dialog', {
    template: '#template-dialog',
    replace: 'true',
    data: function() {
      return {
        data: {},
        shown: false,
        buttonsObj: {
          ok: false,
          cancel: "Cancel"
        }
      }
    },
    props: [
      "onShow",
      "onShown",
      "onDismiss",
      "onDismissed",
      "onAccept",
      "onAccepted", {
        type: String,
        name: 'title',
        default: function() {
          return "";
        }
      }, {
        type: String,
        name: 'buttons',
        default: function() {
          return {
            ok: false,
            cancel: "Cancel"
          };
        }
      }
    ],
    methods: {
      id: function(suffix) {
        return (this.$el["id"] || "modalDialog") + (suffix ? "-" + suffix : "");
      },
      show: function(data) {
        var self = this;
        if (isFunction(this["onShow"]))
          this.onShow();
        this.$data.data = data;
        this.$data.shown = true;
        setTimeout(function() {
          self.$el.getElementsByTagName('input')[0].focus();
          if (isFunction(self["onShown"]))
            self.onShown();
        }, 100);
      },
      block: function(e) {
        e.stopPropagation();
      },
      hide: function() {
        if (!isFunction(this["onDismiss"]) || this.onDismiss()) {
          this.$data.shown = false;
          if (isFunction(this["onDismissed"]))
            this.onDismissed();
        }
      },
      accept: function() {
        //this.$dispatch(this.id('accepted'), this.data);
        if (!isFunction(this["onAccept"]) || this.onAccept(this.$data.data)) {
          if (isFunction(this["onAccepted"]))
            this.onAccepted(this.$data.data);
          this.hide();
        }
      },
      dismiss: function() {
        // this.$dispatch(this.id('dismissed'));
        this.hide();
      }
    },
    ready: function() {
      var buttons, parser, parent, template, el;
      template = this.$el.getElementsByTagName('script')[0];
      parent = template.parentNode;
      parser = new DOMParser();
      el = parser.parseFromString(template.innerText, "text/html");
      this.$compile(el);
      prependNodes(template, el.body.childNodes);
      parent.insertBefore(el.body, template);
      //template.parentNode.replaceChild(template, el.body);
      //var el = parser.parseFromString(template.innerText , "text/html")
      eval("buttons = {" + this.buttons.replace("=", ":") + "}");
      extend(this.$data.buttonsObj, buttons);
      this.$on(this.id('show'), function(data) {
        this.show(data);
      });
    }
  });

  Vue.component('todo-item', {
    template: '#template-todo-item',
    replace: 'true',
    computed: {
      index: function() {
        var list = this.$parent.$data.todos;
        return list.indexOf(this.$data);
      },
      hasDueOn: function() {
        return this.dueOn != null && this.recureOn == 0;
      },
      isQued: function() {
        return !this.doing && !this.done && !this.archived;
      },
      isDoing: function() {
        return this.doing && !this.done && !this.archived;
      },
      isDone: function() {
        return this.done && !this.archived;
      },
      isDue: function() {
        if (this.dueOn == null || this.done || this.archived) return false;
        return this.dueOn.isBefore(moment());
      },
      isPastDue: function() {
        if (this.dueOn == null) return false;
        return this.dueOn.isBefore(moment(), "day");
      },
      isArchived: function() {
        return this.archived;
      }
    },
    methods: {
      upvote: function(e) {
        e.cancelBubble = true;
        if (this.priority + 1 < 6) this.priority++;
      },
      downvote: function(e) {
        e.cancelBubble = true;
        if (this.priority - 1 > -1) this.priority--;
      },
      markDo: function(e) {
        e.cancelBubble = true;
        if (this.archived) return;
        if (this.isQued) {
          this.doing = true;
          this.done = false;
        } else if (this.isDoing) {
          this.doneOn = moment();
          this.doing = false;
          if (this.recureOn == 0) this.done = true;
          else {
            this.dueOn = computeNextDueDate(this.dueOn, this.recureOn);
          }
        } else if (this.isDone) {
          this.doneOn = null;
          this.doing = false;
          this.done = false;
        }
      },
      archive: function(e) {
        e.cancelBubble = true;
        this.archived = !this.archived;
      },
      remove: function(e) {
        e.cancelBubble = true;
        this.$parent.$data.todos.$remove(this.index);
      }
    }
  });

  var ToDos = new Vue({
    el: '#toDoList',
    data: {
      showMenu: false,
      newItem: false,
      newItemData: "",
      editingItem: false,
      editingItemData: {
        index: null,
        content: "",
        more: "",
        dueOn: "",
        recureOn: 0
      },
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
        archiveAfter: 15,
        deleteAfter: 0
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
        if (LocalDrive) LocalDrive.save(getStorageKey(), todos);
      }, true);
      refreshDueDates(this);
    }
  });
})(window);
