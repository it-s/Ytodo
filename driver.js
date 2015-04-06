/*global Vue, todoStorage */
(function (exports) {

    var STORAGE_KEY = 'debug-todo-store';
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
    
    function loadLocalData() {
        var keys = ['addedOn','dueOn','doneOn'];
        var data = LocalDrive.fetch(STORAGE_KEY);
        data.forEach(function(item){
            keys.forEach(function(key){
                if(item.hasOwnProperty(key) && item[key] !== null) item[key] = moment(item[key]);
            });
        });
        return data;
    }

    function refreshDueDates(instance) {
        var now = moment(),
            next = moment(),
            timeout = 0;
        next.add(1, 'd');
        timeout = next - now;

        instance.todos.forEach(function (item) {
            if (item.dueOn == null) return;
            var then =item.dueOn,
                now = moment();
            if (then <= now) item.doing = true;
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
                return !this.doing && !this.done && !this.archived
            },
            isDoing: function () {
                return this.doing && !this.done && !this.archived
            },
            isDone: function () {
                return !this.doing && this.done && !this.archived
            },
            isDue: function () {
                if (this.dueOn == null) return false;
                var then = this.dueOn,
                    now = moment();
                return then == now;
            },
            isPastDue: function () {
                if (this.dueOn == null) return false;
                var then = this.dueOn,
                    now = moment();
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
                if (this.archived) return;
                if (!this.doing && !this.done) {
                    this.doing = true;
                    this.done = false;
                } else if (this.doing && !this.done) {
                    this.doneOn = moment();
                    this.doing = false;
                    if (this.recureOn == 0) this.done = true;
                    else {
                        this.dueOn = computeNextDueDate(this.dueOn, this.recureOn);
                    }
                } else if (!this.doing && this.done) {
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
                this.$parent.$remove(this.$data);
            }
        }
    });

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
            if (LocalDrive) this.todos = loadLocalData();
            this.$watch('todos', function (todos) {
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
                this.editedItemData.index = this.$data.todos.lastIndexOf(item);
                this.editedItemData.content = item.content;
                this.editedItemData.more = item.more || "";
                this.editedItemData.dueOn = item.dueOn? item.dueOn.format("YYYY-MM-DD"): "";
                this.editedItemData.recureOn = item.recureOn || 0;
                this.editing = true;
            },
            onUpdateItemClicked: function () {
                var dateField = document.getElementById("itemDue");
                var item = this.$data.todos[this.editedItemData.index];
                item.content = this.editedItemData.content;
                item.more = this.editedItemData.more;
                item.dueOn = this.editedItemData.dueOn == "" ? null : moment(this.editedItemData.dueOn);
                item.recureOn = this.editedItemData.recureOn;
                this.editing = false;
            }
        }
    });
})(window);