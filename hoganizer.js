var hogan = require('hogan.js');
var _ = require('underscore');
var fs = require('fs');
var walkdir = require('walkdir').sync;

var Hoganizer = function(options) {
  var defaults = {
    templateDir: './templates',
    extension: '.mustache',
    writeLocation: './templates.js'
  }
  this.config = _.extend(defaults, options);
  this.root = process.cwd() + "/";
}

// Search for all templates in the templates folder
Hoganizer.prototype.extractTemplates = function() {
  var content = walkdir(this.root + this.config.templateDir);
  this.templateFiles = _.filter(content, this.isTemplate, this);
}

// Check whether a filename looks like a template
Hoganizer.prototype.isTemplate = function(file) {
  var extension = this.config.extension.substr(1);
  var parts = file.split('.');
  if(_.size(parts) !== 1 && _.last(parts) === extension)
    return true;
}

// Load all templates from disk
Hoganizer.prototype.loadTemplates = function() {
  this.templates = _.map(this.templateFiles, function(template) {
    // remove dir structure & remove extension
    var name = _.last(template.split('/'));
    name = name.replace(this.config.extension, '');

    var content = fs.readFileSync(template, 'utf-8');
    content = this.removeByteOrderMark(content);

    return {
      content: content,
      name: name
    }
  }, this)  
}

// Remove utf-8 byte order mark, http://en.wikipedia.org/wiki/Byte_order_mark
Hoganizer.prototype.removeByteOrderMark = function(text) {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.substring(1);
  }
  return text;
}

// Create a string with the Hogan's template engine (for precompiled
// templates) and all the precompiled templates itself
Hoganizer.prototype.compileTemplates = function() {
  var result = '//\t\t }} Precompiled by Hoganizer {{\n';
  result += '//\t\t }} Compiled templates are at the bottom {{\n\n';

  // also provide hogan's render engine
  result += fs.readFileSync('./template.js', 'utf-8');

  result += '(function() {var templates = {};';
  _.each(this.templates, function(template) {
    result += [
      '\ntemplates.',
      template.name,
      ' = new Hogan.Template(',
      hogan.compile(template.content, {asString: 1}),
      ');'
    ].join('');
  }, this);
  result += '\nwindow.templates = templates})();'

  return this.result = result;
}

// 
//  ---- Public API ----
// 

// Retrieve all template files, precompile them
// and spit out a vanilla js version of all templates
Hoganizer.prototype.precompile = function() {
  this.extractTemplates();
  this.loadTemplates();
  this.compileTemplates();

  return this.result;
}

// Return the previously compiled vanilla js script
// if none available, compile on the fly
Hoganizer.prototype.getCached = function() {
  return this.result || this.precompile();
}

// Write out compiled version to writeLocation
Hoganizer.prototype.write = function() {
  this.precompile();
  fs.writeFileSync(this.root + this.config.writeLocation, this.result);
}

module.exports = Hoganizer;