var hogan = require('hogan.js');
var _ = require('underscore');
var fs = require('fs');
var walkdir = require('walkdir').sync;

var Hoganizer = function(options) {
  var defaults = {
    templateDir: './templates',
    extension: '.mustache',
    writeLocation: './templates.js'
  };
  this.config = _.extend(defaults, options);

  // make paths static
  if(this.config.templateDir.indexOf('/') !== 0)
    this.config.templateDir = process.cwd() + "/" + this.config.templateDir;
  if(this.config.writeLocation.indexOf('/') !== 0)
    this.config.writeLocation = process.cwd() + "/" + this.config.writeLocation;
}

// Search for all templates in the templates folder
Hoganizer.prototype.extractTemplates = function() {
  var content = walkdir(this.config.templateDir);
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

    // extract the path from the dir structure
    var path = template.replace(this.config.templateDir, '');
    path = path.replace(this.config.extension, '');
    path = path.split('/');
    path.shift();
    path = path.join('.');

    var content = fs.readFileSync(template, 'utf-8');
    content = this.removeByteOrderMark(content);

    return {
      content: content,
      name: name,
      path: path
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

  result += '(function() {\n';

  // also provide hogan's render engine
  result += fs.readFileSync(__dirname + '/template.js', 'utf-8');

  // initialize nested attributes from path info
  result += 'var templates = {};\n';
  result += _.map(_.uniq(_.reduce(_.pluck(this.templates, 'path'),
    function(memo, path) { dirs = path.split('.'); dirs.pop(); for(i=1;i<=dirs.length;i++){ memo.push(dirs.slice(0, i).join('.')); } return memo; },
    [])), function(path) { return 'templates.' + path + ' = {};\ntemplates.raw.' + path + ' = {};\n'}).join('');

  _.each(this.templates, function(template) {
    result += [
      '\ntemplates.raw.',
      template.path,
      ' = new exports.Template(',
      hogan.compile(template.content, {asString: 1}),
      ');'
    ].join('');
  }, this);
  _.each(this.templates, function(template) {
    result += [
      '\ntemplates.',
      template.path,
      ' = function(data) { templates.raw.',
      template.path,
      '.render(data); };');'
    ].join('');
  }, this);
  result += '\nmodule.exports = templates;\n})();'

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
  fs.writeFileSync(this.config.writeLocation, this.result);
}

module.exports = Hoganizer;