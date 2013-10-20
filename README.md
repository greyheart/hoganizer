hoganizer
=========

![The Hogan](http://askmike.org/stuff/hogan.jpg)

hogan.js precompiler for client side vanillaJS templates

*Inspired by [templatizer](https://github.com/HenrikJoreteg/templatizer) and built on top of [hogan.js](http://twitter.github.io/hogan.js/)*

## Hoganizer?

Hoganizer precompiles mustache templates in to vanillaJS javascript functions so they render blazingly fast on the client side. This renders your app way faster because:

- Hoganizer parses the templates way before they are shipped to the client, remember that parsing is always the most time consuming operation in template land.
- Hoganizer outputs vanillaJS functions that only need the small template renderer from Hogan.js, this means you are not sending the whole hogan.js template engine over the wire, but only bare javascript functions and a small template wrapper.

## When should I use Hoganizer?

When you are doing **client side** templating but want to speed up your template parsing on the frontend, Hoganizer is for you! You can use Hoganizer to compile all templates and output to a file or as a string. If you are writing mustache templates which you want to render on the backend (using express for example) this is not for you.

## How do I use Hoganizer?

    var Hoganizer = require('hoganizer');
    var hoganizer = new Hoganizer({
        templateDir: './templates',
        extension: '.mustache',
        writeLocation: './templates.js'
    });

    // Compile all mustache templates in `./templates` and write
    // them into frontend js file to `./templates.js`.
    hoganizer.write();

    // Compile but save the script as a string
    var vanillaJS = hoganizer.precompile();

    // Grab the latest compiled version
    var vanillaJS = hoganizer.getCached();

## Example

If you are working on frontend javascript website you can put all mustache templates in a `templates` folder and use Hoganizer to precompile the whole folder into a single vanillaJS file.

### In your templates folder:

Create a file called `home.mustache` inside `templates`:

    I am <em>{{name}}</em>, I like {{hobby}}!

### In your frontend HTML:

    <script src='templates.js'></script>

### In your frontend JS

    var NameOfTemplate = 'home';
    var parameters = {name: 'Hulk', hobby: 'wrestling' };

    var renderedTemplate = templates[NameOfTemplate].render(parameters);
    // -> 'I am <em>Hulk</em>, I like Wrestling!';
    $('body').html(renderedTemplate);

### Production

Run `hoganizer.write();` to create compiled functions and save them into `templates.js`, a static file which you can serve through a normal webserver.

To squeeze out the best performance, I recommend JS minifying the resulting templates.js (and for example concatenating it with the rest of your frontend JS) as well as HTML minifying the mustache files *before* they are written to vanillaJS by the write method (because after this process JS minifiers do not touch compiled JS strings).

**Warning: don't use the precompile & write methods on a in production running nodejs webserver. They use sync fs methods and thus block your whole node server!**

### Dev

You can route your dev environment through an express server for example and you can serve all static files normally but generate templates on the fly for requests to `templates.js`. This way you can keep editting the templates in the `templates` folder and on every refresh you get the latest version served.

    var express = require('express');
    var app = express();

    app.configure(function(){
        app.use(app.router);
        app.use(express.errorHandler({dumpExceptions:true, showStack:true}));
        // serve all files out of the folder `static`
        app.use(express.static(__dirname + '/static'));
    });
    var port = 1337;
    app.listen(port);
    // browse to localhost:1337

And you can catch all calls to `/templates.js` and serve a fresh version of your compiled templates.

    var Hoganizer = require('hoganizer');
    var hoganizer = new Hoganizer();
    app.get("/templates.js",  function(req, res) {
        res.contentType(".js");
        res.send(hoganizer.precompile());
    });