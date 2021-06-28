{ app, BrowserWindow, ipcMain } = require "electron"
_domain_path = "./"
_config = require "#{_domain_path}config.json"
Load = require "#{_domain_path}js/core/load.js"
PullRequest = require "#{_domain_path}js/input/pull-request.js"
Checkout = require "#{_domain_path}js/core/checkout.js"
Save = require "#{_domain_path}js/core/save.js"
ChildPorcess = require "child-process-promise"
CreatedTask = require "./modules/created-task.js"
OtherTask = require "./modules/other-task.js"
refer = require "./modules/refer.js"
writeDaily = require "./modules/write-daily.js"

app.whenReady().then ->
    new BrowserWindow {
        webPreferences: {
            preload: __dirname + "/preload.js"
            devTool: true
        }
    }
        .loadFile "html/index.html"

getTasks = ->
    Promise.resolve()
    .then ->
        Load "#{_domain_path}tasks.json"
    .then (tasks) ->
        Promise.all tasks.map (item, index) ->
            switch item.type
                when "created"
                    tasks[index] = new CreatedTask item
                        .reload()
                when "review"
                    PullRequest item, _config
                when "other"
                    tasks[index] = new OtherTask item
                        .reload()
    .then (tasks) ->
        Promise.all tasks.map (item) ->
            return item if item.type is "created" or item.type is "other"
            refer item.refs?.url
                .then (refs) -> item.refs = refs; item
    .then (tasks) ->
        tasks.sort (a, b) -> a.refs?.dueDate - b.refs?.dueDate or a.createdAt - b.createdAt
    .then (tasks) ->
        console.log tasks
        tasks

ipcMain.handle "get-tasks", ->
    getTasks()

ipcMain.handle "get-directories", ->
    Promise.resolve _config.directories

ipcMain.handle "checkout", (event, task) ->
    Checkout task, _config.directories

ipcMain.handle "open-editor", (event, task) ->
    ChildPorcess.exec "open -a 'visual studio code' #{_config.directories[task.repo]}"

ipcMain.handle "open-pr", (event, task) ->
    ChildPorcess.exec "open #{task.url}"

ipcMain.handle "add-creating", (event, payload) ->
    Promise.resolve()
    .then ->
        CreatedTask.create payload
    .then (task) ->
        Promise.resolve()
        .then ->
            Load "#{_domain_path}tasks.json"
        .then (currentTasks) ->
            currentTasks.push task

            Save "#{_domain_path}tasks.json", currentTasks

ipcMain.handle "add-review", (event, payload) ->
    match = payload.url.match /https\:\/\/github.com\/([\w\d\-\/]+)\/pull\/(\d+)/

    Promise.resolve()
    .then ->
        {
            type: "review"
            repo: match[1]
            number: match[2]
            dir: _config.directories[match[1]]
        }
    .then (task) ->
        throw "no directory config" if not task.dir?

        Promise.resolve()
        .then ->
            Load "#{_domain_path}tasks.json"
        .then (currentTasks) ->
            return if currentTasks.some (item) -> item.type is "review" and item.repo is task.repo and item.number is task.number

            currentTasks.push task
            Save "#{_domain_path}tasks.json", currentTasks

ipcMain.handle "add-other", (event, payload) ->
    Promise.resolve()
    .then ->
        OtherTask.create payload
    .then (task) ->
        Promise.resolve()
        .then ->
            Load "#{_domain_path}tasks.json"
        .then (currentTasks) ->
            currentTasks.push task
            Save "#{_domain_path}tasks.json", currentTasks

ipcMain.handle "write-diary", ->
    getTasks()
    .then (tasks) ->
        writeDaily tasks
    .then (tasks) ->
        tasks.filter (item) -> item.currentIndex < item.todos.length
    .then (tasks) ->
        Save "#{_domain_path}tasks.json", tasks
