
const childProcess = require("child_process")
const fileSystem = require("fs")
const moment = require("moment")
moment.locale("ja")
const refer = require("./refer.js")
const request = require("request-promise")
const util = require("util")

const config = require("../config.json")

import { Task, Refs } from "./types"

class CreatedTask implements Task {
    type: "created"
    number: string
    title!: string
    url!: string
    createdAt!: number
    refs?: Refs
    todos!: { name: string, isDone: " " | "x" }[]
    currentIndex!: number
    previousIndex: number
    progressable!: boolean
    repo: string
    head!: string
    base!: string

    constructor(payload: { number: string, previousIndex: number, repo: string }) {
        this.type = "created"
        this.number = payload.number
        this.previousIndex = payload.previousIndex
        this.repo = payload.repo
    }

    async reload(): Promise<this> {
        const pr = await request({
            uri: "https://api.github.com/repos/" + this.repo + "/pulls/" + this.number,
            headers: {
                "User-Agent": "taskmanagement v3",
                "Authorization": "token " + config.github.access_token,
            },
            json: true,
        })

        this.title = pr.title
        this.url = pr.html_url
        this.createdAt = moment(pr.created_at).valueOf()
        this.head = pr.head.ref
        this.base = pr.base.ref

        const refsMatch: RegExpMatchArray = pr.body.match(/https?\:\/\/\S+/)
        this.refs = await refer(refsMatch?.[0])

        const todosMatch: RegExpMatchArray = pr.body.match(/\- \[([ x])\] (.*)/g) || []
        this.todos = todosMatch.map((todo) => {
            return {
                name: todo.substring(6),
                isDone: todo.substring(3, 4) as " " | "x",
            }
        })
        this.currentIndex = this.todos.findIndex((todo) => todo.isDone === " ")
        if (this.currentIndex === -1) {
            this.currentIndex = this.todos.length
            this.progressable = false
        } else {
            this.progressable = ! this.todos[this.currentIndex].name.match(/(完了|受け取り)( ＼ｵﾜﾀ／)?$/)
        }

        return this
    }

    async checkout(): Promise<this> {
        await util.promisify(childProcess.exec)("git checkout " + this.head, {
            cwd: config.directories[this.repo],
        })

        return this
    }

    async openEditor(): Promise<this> {
        await util.promisify(childProcess.exec)("open -a 'visual studio code' " + config.directories[this.repo])

        return this
    }

    async openWeb(): Promise<this> {
        await util.promisify(childProcess.exec)("open " + this.url)

        return this
    }

    static async create(payload: { repo: string, refs: { url: string }, head: string, base: string }): Promise<CreatedTask> {
        const exec = (command: string): void => util.promisify(childProcess.exec)(command, { cwd: config.directories[payload.repo] })
        await exec("git fetch")
        await exec("git checkout --no-track -b " + payload.head + " origin/" + payload.base)
        await exec("git commit --allow-empty -m \"WIP 用の空コミット\"")
        await exec("git push origin " + payload.head)

        let template: string
        try {
            template = await util.promisify(fileSystem.readFile)("./templates/" + payload.repo + ".md", { encoding: "utf8" })
        } catch (e) {
            template = ""
        }

        const refs = await refer(payload.refs.url)

        const pr = await request({
            method: "POST",
            uri: "https://api.github.com/repos/" + payload.repo + "/pulls",
            headers: {
                "User-Agent": "taskmanagement v3",
                "Authorization": "token " + config.github.access_token,
            },
            body: {
                title: refs
                    ? "[WIP] Resolves " + refs.title
                    : "[WIP] Untitled",
                body: template.replace(/{{\s*?([\w\.]+)\s*}}/g, (match, $1) => {
                    return $1.split(".").reduce((current: any, key: string): any => {
                        return current[key] || []
                    }, payload)
                }),
                head: payload.head,
                base: payload.base,
            },
            json: true,
        })

        return new CreatedTask({
            number: pr.number,
            previousIndex: 0,
            repo: payload.repo,
        })
    }
}

module.exports = CreatedTask
