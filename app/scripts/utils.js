'use strict';

var utils = {
  createTooltip: function (title, desc, classes) {
    var tooltip = document.createElement('div');
    classes = classes || [];
    classes.push('mappingbird-tooltip');
    tooltip.setAttribute('class', classes.join(' '));
    tooltip.innerHTML = '<h1>' + title + '</h1>' + '<p>' + desc + '</p>';
    return tooltip;
  }
}
