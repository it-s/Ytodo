/*global Vue, todoStorage */
(function(exports) {
  'use strict';

  /*
  * Helper functions
  *
  */
  
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

  function getStorageKey(store, key) {
    return store.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '-').toLowerCase() + key;
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
        item.done && !item.archived && item.addedOn.isAfter(moment(), instance.options.archiveAfter)
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
  
  exports._ = {
	prependNodes: prependNodes,
	isFunction: isFunction,
	extend: extend,
	getUrlVars: getUrlVars,
	getStorageKey: getStorageKey,
	refreshDueDates: refreshDueDates,
	computeNextDueDate: computeNextDueDate
  };
 
})(window);
