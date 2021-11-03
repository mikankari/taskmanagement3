{ app, BrowserWindow, ipcMain } = require "electron"
_domain_path = "./"
_config = require "#{_domain_path}config.json"
Tasks = require "./modules/tasks.js"

app.whenReady().then ->
    new BrowserWindow {
        webPreferences: {
            preload: __dirname + "/preload.js"
            devTool: true
        }
    }
        .loadFile "html/index.html"

tasks = null

ipcMain.handle "get-tasks", ->
    Tasks.load()
        .then (loadedTasks) ->
            tasks = loadedTasks
            console.log tasks
            tasks.toArray()

ipcMain.handle "get-directories", ->
    Promise.resolve _config.directories

ipcMain.handle "checkout", (event, payload) ->
    tasks.find payload
        .checkout()

ipcMain.handle "open-issue", (event, payload) ->
    tasks.find payload
        .openIssue()

ipcMain.handle "open-pr", (event, payload) ->
    tasks.find payload
        .openWeb()

ipcMain.handle "add-creating", (event, payload) ->
    tasks.addCreated payload

ipcMain.handle "add-review", (event, payload) ->
    tasks.addReview payload

ipcMain.handle "add-other", (event, payload) ->
    tasks.addOther payload

ipcMain.handle "write-diary", ->
    tasks.writeDaily()
