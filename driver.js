/*global Vue, todoStorage */
(function (exports) {
    'use strict';

    var STORAGE_KEY = '-todo-store';
    var STORAGE_STORE = 'debug';
    var ARCHIVE_AFTER = "month";
    
//    var STORAGE_MODEL = [{field:"id",type:"integer"},{field:"content",type:"string"},{field:"more",type:"string"},{field:"doing",type:"bool"},{field:"done",type:"bool"},{field:"archived",type:"bool"},{field:"priority",type:"integer"},{field:"addedOn",type:"date"},{field:"dueOn",type:"date"},{field:"doneOn",type:"date"},{field:"recureOn",type:"integer"},{field:"tags",type:"array"}];

    var ToDo = function (id, content) {
        this.id = id;
        this.content = content;
        this.more = null,
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
    
    function getUrlVars() {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for(var i = 0; i < hashes.length; i++) {
          hash = hashes[i].split('=');
          vars.push(hash[0]);
          vars[hash[0]] = hash[1];
        }
      return vars;
      }
 
    
    function getStorageKey(){
        return STORAGE_STORE.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g,'-').toLowerCase() + STORAGE_KEY;
    }
    
    function loadLocalData() {
        var vars = getUrlVars();
        //if (vars.hasOwnProperty('store')){
            STORAGE_STORE = vars["store"] || "YTODO";
            var keys = ['addedOn','dueOn','doneOn'];
            var data = LocalDrive.fetch(getStorageKey());
            data.forEach(function(item){
                keys.forEach(function(key){
                    if(item.hasOwnProperty(key) && item[key] !== null) item[key] = moment(item[key]);
                });
            });
            return data;
        //}
    }

    function refreshDueDates(instance) {
        var now = moment(),
            next = moment(),
            timeout = 0;
        next.add(1, 'hour');
        timeout = next - now;

        instance.todos.forEach(function (item) {
            if (
                !item.done 
                && !item.doing
                && item.dueOn != null
                && item.dueOn.isBefore(moment())
               ) item.doing = true;
            else if (
                item.done
                && !item.archived
                && item.addedOn.isAfter(moment(), ARCHIVE_AFTER)
                ) item.archived = true;
        });

        setTimeout(function () {
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

    Vue.component('todo-item', {
        template: '#template-todo-item',
        replace: 'true',
        computed: {
            hasDueOn: function () {
                return this.dueOn != null && this.recureOn == 0;
            },
            isQued: function () {
                return !this.doing && !this.done && !this.archived;
            },
            isDoing: function () {
                return this.doing && !this.done && !this.archived;
            },
            isDone: function () {
                return this.done && !this.archived;
            },
            isDue: function () {
                if (this.dueOn == null || this.done || this.archived) return false;
                return this.dueOn.isBefore(moment());
            },
            isPastDue: function () {
                if (this.dueOn == null) return false;
                return this.dueOn.isBefore(moment(),"day");
            },
            isArchived: function () {
                return this.archived;
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
            archive: function (e) {
                e.cancelBubble = true;
                this.archived = !this.archived;
            },
            remove: function (e) {
                e.cancelBubble = true;
                this.$parent.$remove(this.$data);
            }
        }
    });

    var ToDos = new Vue({
        el: '#toDoList',
        data: {
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
            todosQued: function (todos) {
                return todos.filter(function (todo) {
                    return !todo.archived && !todo.doing && !todo.done
                }).sort(function (a, b) {
                    return Number(a.priority) < Number(b.priority);
                });
            },
            todosDoing: function (todos) {
                return todos.filter(function (todo) {
                    return !todo.archived && todo.doing && !todo.done
                }).sort(function (a, b) {
                    return Number(a.priority) < Number(b.priority);
                });
            },
            todosDone: function (todos) {
                return todos.filter(function (todo) {
                    return !todo.archived && !todo.doing && todo.done
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
            if (LocalDrive) this.todos = loadLocalData();
            this.$watch('todos', function (todos) {
                if (LocalDrive) LocalDrive.save(getStorageKey(), todos);
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
                this.newItemData = '';
                this.newItem = true;
                setTimeout(function () {
                    el.getElementsByTagName('input')[0].focus();
                }, 100);
            },
            onAddItemClicked: function () {
                var value = this.newItemData && this.newItemData.trim();
                if (value)
                    this.todos.unshift(new ToDo(this.todos.length, value));
                this.newItemData = '';
                this.newItem = false;
                this.$event.cancelBubble = true;
                this.$event.returnValue = false;
            },
            onEditItemClicked: function (item) {
                this.editingItemData.index = this.$data.todos.lastIndexOf(item);
                this.editingItemData.content = item.content;
                this.editingItemData.more = item.more || "";
                this.editingItemData.dueOn = item.dueOn? item.dueOn.format("YYYY-MM-DD"): "";
                this.editingItemData.recureOn = item.recureOn || 0;
                this.editingItem = true;
            },
            onUpdateItemClicked: function () {
                var item = this.$data.todos[this.editingItemData.index];
                item.content = this.editingItemData.content;
                item.more = this.editingItemData.more;
                item.dueOn = this.editingItemData.dueOn == "" ? null : moment(this.editingItemData.dueOn);
                item.recureOn = this.editingItemData.recureOn;
                this.editingItem = false;
            }
        }
    });
})(window);
