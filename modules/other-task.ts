
const childProcess = require("child_process")
const moment = require("moment")
moment.locale("ja")
const refer = require("./refer.js")
const request = require("request-promise")
const util = require("util")

const config = require("../config.json")

import { Task, Refs } from "./types"

class OtherTask implements Task {
    type: "other"
    number: string
    title!: string
    url: string
    createdAt: number
    refs?: Refs
    todos!: { name: string, isDone: boolean }[]
    currentIndex!: number
    previousIndex: number
    progressable!: boolean

    constructor(payload: { number: string, previousIndex: number, url: string, createdAt: number }) {
        this.type = "other"
        this.number = payload.number
        this.previousIndex = payload.previousIndex
        this.url = payload.url
        this.createdAt = payload.createdAt
    }

    async reload(): Promise<this> {
        const card = await request({
            uri: "https://api.trello.com/1/cards/" + this.number,
            headers: {
                "User-Agent": "taskmanagement v3",
                "Authorization": 'OAuth oauth_consumer_key="' + config.trello.key + '", oauth_token="' + config.trello.token + '"',
            },
            qs: {
                fields: "name,desc,due",
                checklists: "all",
            },
            json: true,
        })

        this.title = card.name

        const refsMatch = card.desc.match(/https?\:\/\/\S+/)
        this.refs = await refer(refsMatch?.[0])

        if (this.refs?.dueDate === undefined) {
            if (this.refs === undefined) {
                this.refs = {
                    type: "trello",
                    number: this.number,
                    title: this.title,
                    priority: 0,
                }
            }
            const dueDate = card.due && moment(card.due)
            this.refs.dueDate = dueDate?.valueOf()
            this.refs.dueDateFromNow = dueDate?.fromNow()
        }

        this.todos = (card.checklists[0].checkItems as any[])
            .sort((a, b) => a.pos - b.pos)
            .map((item) => {
                return {
                    name: item.name,
                    isDone: item.state === "complete",
                }
            })
        this.currentIndex = this.todos.findIndex((todo) => ! todo.isDone)
        if (this.currentIndex === -1) {
            this.currentIndex = this.todos.length
            this.progressable = false
        } else {
            this.progressable = ! this.todos[this.currentIndex].name.match(/(完了|受け取り)( ＼ｵﾜﾀ／)?$/)
        }

        return this
    }

    async checkout(): Promise<this> {
        // なにもしない

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

    static async create(payload: { refs: { dueDate: string, url: string }, todos: string }): Promise<OtherTask> {
        const refs = await refer(payload.refs.url)

        const card = await request({
            method: "POST",
            uri: "https://api.trello.com/1/cards",
            headers: {
                "User-Agent": "taskmanagement v3",
                "Authorization": 'OAuth oauth_consumer_key="' + config.trello.key + '", oauth_token="' + config.trello.token + '"',
            },
            body: {
                name: ((refs) => {
                    switch (refs?.type) {
                        case "redmine":
                            return "refs #" + refs.number + " " + refs.title
                        case "github_issue":
                            return "resolves " + refs.title
                        default:
                            return "untitled"
                    }
                })(refs),
                desc: payload.refs.url,
                due: payload.refs.dueDate,
                idList: config.trello.idList,
            },
            json: true,
        })
        const checklist = await request({
            method: "POST",
            uri: "https://api.trello.com/1/checklists",
            headers: {
                "User-Agent": "taskmanagement v3",
                "Authorization": 'OAuth oauth_consumer_key="' + config.trello.key + '", oauth_token="' + config.trello.token + '"',
            },
            body: {
                idCard: card.id,
            },
            json: true,
        })
        for (let todoName of payload.todos.split("\n")) {
            if (todoName === "") {
                continue
            }
            await request({
                method: "POST",
                uri: "https://api.trello.com/1/checklists/" + checklist.id + "/checkItems",
                headers: {
                    "User-Agent": "taskmanagement v3",
                    "Authorization": 'OAuth oauth_consumer_key="' + config.trello.key + '", oauth_token="' + config.trello.token + '"',
                },
                body: {
                    name: todoName,
                },
                json: true,
            })
        }

        return new OtherTask({
            number: card.id,
            previousIndex: 0,
            url: card.shortUrl,
            createdAt: moment().valueOf(),
        })
    }
}

module.exports = OtherTask
