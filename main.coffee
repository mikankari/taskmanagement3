{ app, BrowserWindow, ipcMain } = require "electron"
_domain_path = "./"
_config = require "#{_domain_path}config.json"
Load = require "#{_domain_path}js/core/load.js"
PullRequest = require "#{_domain_path}js/input/pull-request.js"
Issue = require "#{_domain_path}js/input/issue.js"
Redmine = require "#{_domain_path}js/input/redmine.js"
Checkout = require "#{_domain_path}js/core/checkout.js"
Diary = require "#{_domain_path}js/output/diary.js"
Save = require "#{_domain_path}js/core/save.js"
Publish = require "#{_domain_path}js/core/publish.js"
ChildPorcess = require "child-process-promise"

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
        Promise.all tasks.map (item) -> PullRequest item, _config
    .then (tasks) ->
        Promise.all tasks.map (item) ->
            switch item.repo
                when "mikankari/test1"
                    Issue item, _config
                else
                    item
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
        {
            type: "created"
            repo: payload.repo
            head: payload.head
            base: payload.base
        }
    .then (task) ->
        return task if not payload.refs?.number

        task.refs = {
            number: payload.refs.number
        }
        switch task.repo
            when "mikankari/test1"
                Issue task, _config
            else
                item
    .then (task) ->
        Checkout task, _config.directories
    .then (task) ->
        Publish task, _config, "#{_domain_path}templates"
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

ipcMain.handle "write-diary", ->
    getTasks()
    .then (tasks) ->
        Diary tasks, _config, "#{_domain_path}templates"
    .then (tasks) ->
        tasks.filter (item) -> item.currentIndex < item.todos.length
    .then (tasks) ->
        Save "#{_domain_path}tasks.json", tasks
