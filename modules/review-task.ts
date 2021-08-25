
const childProcess = require("child_process")
const moment = require("moment")
moment.locale("ja")
const refer = require("./refer.js")
const request = require("request-promise")
const util = require("util")

const config = require("../config.json")

import { Task, Refs } from "./types"

class ReviewTask implements Task {
    type: "review"
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
        this.type = "review"
        this.number = payload.number
        this.previousIndex = payload.previousIndex
        this.repo = payload.repo
    }

    async reload(): Promise<this> {
        const pr = await request({
            uri: "https://api.github.com/repos/" + this.repo + "/pulls/" + this.number,
            headers: {
                "User-Agent": "taskmanagement v3",
                "Authorization": "token " + config.github.token,
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

        const reviews: any[] = await request({
            uri: "https://api.github.com/repos/" + this.repo + "/pulls/" + this.number + "/reviews",
            headers: {
                "User-Agent": "taskmanagement v3",
                "Authorization": "token " + config.github.token,
            },
            json: true,
        })
        this.todos = reviews
            .filter((review) => review.user.login === config.github.user)
            .map((review) => ({
                name: "レビュー",
                isDone: "x",
            }))
        if (pr.state === "open" && (pr.requested_reviewers as any[]).some((reviewer) => reviewer.login === config.github.user)) {
            this.todos.push({
                name: "レビュー",
                isDone: " ",
            })
        }
        this.todos.push({
            name: "マージなど完了",
            isDone: pr.state !== "open" ? "x" : " "
        })
        this.currentIndex = this.todos.findIndex((todo) => todo.isDone === " ")
        if (this.currentIndex === -1) {
            this.currentIndex = this.todos.length
            this.progressable = false
        } else {
            this.progressable = this.currentIndex !== this.todos.length - 1
        }

        return this
    }

    async checkout(): Promise<this> {
        const exec = (command: string): void => util.promisify(childProcess.exec)(command, { cwd: config.directories[this.repo] })
        await exec("git fetch")
        await exec("git checkout origin/" + this.head)

        return this
    }

    async openIssue(): Promise<this> {
        if (this.refs?.url) {
            await util.promisify(childProcess.exec)("open " + this.refs.url)
        }

        return this
    }

    async openWeb(): Promise<this> {
        await util.promisify(childProcess.exec)("open " + this.url)

        return this
    }

    static async create(payload: { url: string }): Promise<ReviewTask> {
        const match = payload.url.match(/https\:\/\/github.com\/([\w\d\-\/]+)\/pull\/(\d+)/)
        if (! match) {
            throw "not review of github"
        }
        if (config.directories[match[1]] === undefined) {
            throw "not found config. please add config directories"
        }

        return new ReviewTask({
            number: match[2],
            previousIndex: 0,
            repo: match[1],
        })
    }
}

module.exports = ReviewTask
