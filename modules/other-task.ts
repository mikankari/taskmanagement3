
const childProcess = require("child_process")
const moment = require("moment")
moment.locale("ja")
const request = require("request-promise")
const util = require("util")

const config = require("../config.json")

import { Task, Refs } from "./types"

class OtherTask implements Task {
    type: "other"
    number: string
    title!: string
    url: string
    createdAt!: number
    refs?: Refs
    todos!: { name: string, isDone: " " | "x" }[]
    currentIndex!: number
    previousIndex: number
    progressable!: boolean

    constructor(payload: { number: string, previousIndex: number, url: string }) {
        this.type = "other"
        this.number = payload.number
        this.previousIndex = payload.previousIndex
        this.url = payload.url
    }

    async reload(): Promise<this> {
        const data = await request({
            uri: "https://slack.com/api/conversations.history",
            headers: {
                "User-Agent": "taskmanagement v3",
                "Authorization": "Bearer " + config.slack.token,
            },
            qs: {
                channel: config.slack.channel,
                latest: this.number,
                inclusive: true,
                limit: 1,
            },
            json: true,
        })
        if (! data.ok) {
            throw data.error
        }

        const matches = data.messages[0]?.text.match(/\- \[([ x])\] ([^ ]*)( (\d{4}-\d{2}-\d{2}) まで)?/)
        const dueDate = matches?.[4] && moment(matches[4])

        this.title = matches?.[2]
        this.createdAt = moment(data.messages[0]?.ts, "X").valueOf()
        this.refs = {
            title: this.title,
            dueDate: dueDate?.valueOf(),
            dueDateFromNow: dueDate?.fromNow(),
            priority: 0,
        }
        this.todos = [
            {
                name: this.title,
                isDone: matches?.[1],
            }
        ]
        this.currentIndex = this.todos.findIndex((todo) => todo.isDone === " ")
        if (this.currentIndex === -1) {
            this.currentIndex = this.todos.length
        }
        this.progressable = this.currentIndex < this.todos.length

        return this
    }

    async checkout(): Promise<this> {
        // なにもしない

        return this
    }

    async openEditor(): Promise<this> {
        return await this.openWeb()
    }

    async openWeb(): Promise<this> {
        await util.promisify(childProcess.exec)("open " + this.url)

        return this
    }

    static async create(payload: { title: string, refs: { dueDate: string } }): Promise<OtherTask> {
        const message = await request({
            method: "POST",
            uri: "https://slack.com/api/chat.postMessage",
            headers: {
                "User-Agent": "taskmanagement v3",
                "Authorization": "Bearer " + config.slack.token,
            },
            formData: {
                channel: config.slack.channel,
                text: "- [ ] " + payload.title + " " + (payload.refs.dueDate !== "" ? payload.refs.dueDate + " まで" : ""),
            },
            json: true,
        })
        if (! message.ok) {
            throw message.error
        }

        return new OtherTask({
            number: message.ts,
            previousIndex: 0,
            url: "https://" + config.slack.workspace + ".slack.com/archives/" + config.slack.channel + "/p" + message.ts,
        })
    }
}

module.exports = OtherTask
