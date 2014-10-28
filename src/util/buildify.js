var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    _ = require('underscore'),
    uglifyJS = require('uglify-js');

/**
 * Buildify tasks
 *
 * @param {{run: String}} [options]
 * @constructor Tasks
 */
function Tasks (options) {
    var me = this;

    // properties
    this.tasks = {};
    this.options = {
        run: 'auto' // can be 'auto' or 'manual'
    };
    this.executed = false;

    // set options
    if (options) {
        this.setOptions(options);
    }

    // execute a function on next process tick which will execute the tasks
    // (when configured to be executed automatically)
    if (process && process.nextTick) {
        process.nextTick(function () {
            if (me.options.run == 'auto') {
                me.run();
            }
        });
    }
}

/**
 * Add a task
 * @param {{
 *          name: String,
 *          (depends: String | String[]),
 *          (desc: String),
 *          (task: Function)
 *        }} options
 */
Tasks.prototype.task = function task (options) {
    // test requirements
    if (!options) {
        throw new SyntaxError('Task configuration expected');
    }
    if (!options.name) {
        throw new SyntaxError('Parameter "name" missing');
    }
    else if (this.tasks[options.name]) {
        throw new SyntaxError('Task already existing');
    }

    // create task
    var task = {
        name: options.name,
        desc: options.desc,
        task: options.task,
        executed: false
    };

    // write dependencies
    if (options.depends instanceof Array) {
        task.depends = options.depends;
    }
    else if (options.depends) {
        task.depends = [
            options.depends
        ];
    }
    else {
        task.depends = [];
    }

    // append to list with tasks
    this.tasks[task.name] = task;
};

/**
 * Configure tasks
 * @param {{run: String}} options
 */
Tasks.prototype.setOptions = function setOptions (options) {
    for (var prop in options) {
        if (options.hasOwnProperty(prop)) {
            this.options[prop] = options[prop];
        }
    }
};

/**
 * Run the provided task. Depending tasks will be executed first
 * @param {{
 *          name: String,
 *          (depends: String | String[]),
 *          (desc: String),
 *          (task: Function)
 *        }} task
 * @private
 */
Tasks.prototype._runTask = function _runTask (task) {
    var me = this;

    if (task.executed) {
        throw new Error('Cannot run task: task is already executed');
    }
    task.executed = true;

    // execute dependencies
    if (task.depends) {
        // TODO: give an error on circular dependencies
        task.depends.forEach(function (name) {
            var dep = me.tasks[name];
            if (!dep.executed) {
                me._runTask(dep);
            }
        });
    }

    // execute the task itself
    if (task.task) {
        task.task();
    }
};

/**
 * Run the tasks.
 * If there are command line arguments with task names only these tasks
 * will be executed. Else, all tasks will be executed.
 */
Tasks.prototype.run = function run () {
    if (this.executed) {
        throw new Error('Tasks are already executed');
    }
    this.executed = true;

    // build list with tasks to execute
    var tasks = this.tasks;
    var names;
    if (process.argv.length > 2) {
        // specific task names from command line arguments
        names = process.argv.slice(2);
    }
    else {
        // execute all tasks
        names = Object.keys(tasks);
    }

    // run the selected tasks
    var me = this;
    names.forEach(function (name) {
        var task = tasks[name];
        if (!task) {
            throw new Error('Task "' + name + '" not found');
        }
        if (!task.executed) {
            me._runTask(task);
        }
    });
};

/**
 * Factory method which creates a new Tasks
 *
 * @param {Object} [options]    Constructor options
 */
//module.exports = function(options) {
//    return new Tasks(options);
//};

var tasks = function(options) {
    return new Tasks(options);
};

/**
 * @param {String} [dir]                 Starting directory absolute path. Default: current working dir
 * @param {Object} [options]
 * @param {Object} [options.interpolate] Underscore template settings. Default to mustache {{var}} style interpolation tags.
 * @param {String} [options.encoding]    File encoding ('utf-8')
 * @param {String} [options.eol]         End of line character ('\n')
 * @param {Boolean} [options.quiet]      Whether to silence console output
 */
function Builder(dir, options) {
    dir = dir || process.cwd();

    this.options = _.extend({
        encoding: 'utf-8',
        eol: '\n',
        interpolate: /\{\{(.+?)\}\}/g
    }, options);

    _.templateSettings.interpolate = this.options.interpolate;

    //The current directory
    this.setDir(dir);

    //The content being acted on
    this.content = '';
};

/**
 * Set the current working directory
 *
 * @param {String} absolutePath     Absolute directory path
 */
Builder.prototype.setDir = function(absolutePath) {
    this.dir = path.normalize(absolutePath);

    return this;
};

/**
 * Change the directory, relateive to the current working directory
 *
 * @param {String} relativePath     Directory path, relative to the current directory
 */
Builder.prototype.changeDir = function(relativePath) {
    this.setDir(this.dir + '/' + relativePath);

    return this;
};

/**
 * Set the content to work with
 *
 * @param {String} content
 */
Builder.prototype.setContent = function(content) {
    this.content = content;

    return this;
};

/**
 * Returns the content. Note: this method breaks the chain
 *
 * @return {String}
 */
Builder.prototype.getContent = function() {
    return this.content;
};

/**
 * Load file contents
 *
 * @param {String} file     File path relative to current directory
 */
Builder.prototype.load = function(file) {
    file = path.normalize(this.dir + '/' + file);

    this.content = fs.readFileSync(file, this.options.encoding);

    return this;
};

/**
 * Concatenate file contents
 *
 * @param {String|String[]} files   File path(s) relative to current directory
 * @param {String} [eol]            Join character. Default: '\n'
 */
Builder.prototype.concat = function(files, eol) {
    eol = (_.isUndefined(eol)) ? this.options.eol : eol;

    if (!_.isArray(files)) files = [files];

    var dir = this.dir,
        encoding = this.options.encoding;

    var contents = files.map(function(file) {
        file = path.normalize(dir + '/' + file);

        return fs.readFileSync(file, encoding);
    });

    if (this.content) contents.unshift(this.content);

    this.content = contents.join(eol);

    return this;
};

/**
 * Wrap the contents in a template
 *
 * @param {String} templatePath   Template file path, relative to current directory. Should have a {{body}} tag where content will go.
 * @param {Object} [templateData] Data to pass to template
 */
Builder.prototype.wrap = function(templatePath, templateData) {
    templatePath = path.normalize(this.dir + '/' + templatePath);
    templateData = templateData || {};

    var data = _.extend(templateData, {
        body: this.content
    });

    var templateStr = fs.readFileSync(templatePath, this.options.encoding);

    this.content = _.template(templateStr, data);

    return this;
};

/**
 * Perform a function to manipulate or use the content, function must return the content
 *
 * @param {Function} fn     Function that takes the current content and returns it after an operation
 */
Builder.prototype.perform = function(fn) {
    this.content = fn(this.content);

    return this;
};

/**
 * Uglifies the content
 *
 * @param {Object} [options]
 * @param {Boolean} [options.mangle]    Whether to mangle variable names etc. Default: true
 */
Builder.prototype.uglify = function(options) {
    options = _.extend({
        mangle: true
    }, options);

    var parse = uglifyJS.parser.parse,
        uglify = uglifyJS.uglify;

    var output = parse(this.content);

    output = uglify.ast_mangle(output, { mangle: options.mangle });
    output = uglify.ast_squeeze(output);
    output = uglify.gen_code(output);

    this.content = output;

    return this;
};


/**
 * Save the contents to disk
 *
 * @param {String} file         File path relative to current directory
 */
Builder.prototype.save = function(file) {
    file = path.normalize(this.dir + '/' + file);

    var dir = path.dirname(file);

    mkdirp.sync(dir);

    fs.writeFileSync(file, this.content);

    if (!this.options.quiet) console.log(file);

    return this;
};

/**
 * Reset/clear the contents
 */
Builder.prototype.clear = function() {
    this.content = '';

    return this;
};

/**
 * Factory method which creates a new builder
 *
 * @param {Object} [options]    Constructor options
 */
module.exports = function(dir, options) {
    return new Builder(dir, options);
};

/**
 * Add a task
 * @param {{
 *          name: String,
 *          (depends: String | String[]),
 *          (desc: String),
 *          (task: Function)
 *        }} options
 */
var builderTasks = null; // singleton, lazy loaded
module.exports.task = function (options) {
    // create a tasks if needed
    if (!builderTasks) {
        builderTasks = tasks(options);
    }

    // add the task to the list
    builderTasks.task(options);
};