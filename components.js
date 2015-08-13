/*global Vue, todoStorage */
(function(exports) {
  'use strict';

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
        if (_.isFunction(this["onShow"]))
          this.onShow();
        this.$data.data = data;
        this.$data.shown = true;
        setTimeout(function() {
          self.$el.getElementsByTagName('input')[0].focus();
          if (_.isFunction(self["onShown"]))
            self.onShown();
        }, 100);
      },
      block: function(e) {
        e.stopPropagation();
      },
      hide: function() {
        if (!_.isFunction(this["onDismiss"]) || this.onDismiss()) {
          this.$data.shown = false;
          if (_.isFunction(this["onDismissed"]))
            this.onDismissed();
        }
      },
      accept: function() {
        //this.$dispatch(this.id('accepted'), this.data);
        if (!_.isFunction(this["onAccept"]) || this.onAccept(this.$data.data)) {
          if (_.isFunction(this["onAccepted"]))
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
      _.prependNodes(template, el.body.childNodes);
      parent.insertBefore(el.body, template);
      eval("buttons = {" + this.buttons.replace("=", ":") + "}");
      _.extend(this.$data.buttonsObj, buttons);
      this.$on(this.id('show'), function(data) {
        this.show(data);
      });
    }
  });


  Vue.component('appmenu', {
    template: '#template-appmenu',
    replace: 'true',
    data: function() {
      return {
        open: false
      }
    },
    props: [
      "onShow",
      "onShown",
      "onDismiss",
      "onDismissed"
    ],
    methods: {
      id: function(suffix) {
        return (this.$el["id"] || "appmenu") + (suffix ? "-" + suffix : "");
      },
      show: function() {
        var self = this;
        if (_.isFunction(this["onShow"]))
          this.onShow();
        this.$data.open = true;
      },
      block: function(e) {
        e.stopPropagation();
      },
      hide: function() {
        if (!_.isFunction(this["onDismiss"]) || this.onDismiss()) {
          this.$data.open = false;
          if (_.isFunction(this["onDismissed"]))
            this.onDismissed();
        }
      }
    },
    ready: function() {
      this.$on(this.id('show'), function() {
        this.show();
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
            this.dueOn = _.computeNextDueDate(this.dueOn, this.recureOn);
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
  
})(window);
