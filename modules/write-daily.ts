
const fileSystem = require("fs")
const moment = require("moment")
moment.locale("ja")
const request = require("request-promise")
const util = require("util")

const config = require("../config.json")

import { Task } from "./types"

const writeToDocBase = async (tasks: Task[]): Promise<Task[]> => {
    const renderTasks = (tasks: Task[]): string => {
        const ret = ['<ul>']
        for (let task of tasks) {
            if (! (task.type !== "review" || task.progressable)) {
                continue
            }
            ret.push('  <li>')
            ret.push('    <div style="font-size: 1.4rem;">')
            ret.push('      <a href="' + task.url + '" target="_blank">' + task.title + '</a>')
            ret.push('    </div>')
            ret.push('    <ul>')
            if (task.previousIndex < task.currentIndex) {
                for (let progress of task.todos.slice(task.previousIndex, task.currentIndex)) {
                    ret.push('      <li>[' + progress.isDone + '] ' + progress.name + '</li>')
                }
            }
            if (task.currentIndex < task.todos.length) {
                const current = task.todos[task.currentIndex]
                ret.push('      <li>[' + current.isDone + '] ' + current.name + '</li>')
            }
            ret.push('    </ul>')
            if (task.currentIndex + 1 < task.todos.length) {
                ret.push('    <details style="margin: 0 0 1em;">')
                ret.push('      <summary style="color: #aaa; font-size: 1.2rem;">もっと後</summary>')
                ret.push('      <ul>')
                for (let todo of task.todos.slice(task.currentIndex + 1)) {
                    ret.push('        <li>[' + todo.isDone + '] ' + todo.name + '</li>')
                }
                ret.push('      </ul>')
                ret.push('    </details>')
            }
            ret.push('  </li>')
        }
        ret.push('</ul>')
        return ret.join("\n")
    }

    const comments = await request({
        uri: "https://slack.com/api/conversations.history",
        headers: {
            "User-Agent": "taskmanagement v3",
            "Authorization": "Bearer " + config.slack.token,
        },
        qs: {
            channel: config.slack.channel,
            oldest: moment({ hour: 0 }).unix(),
            count: 1000,
        },
        json: true,
    })
    if (! comments.ok) {
        throw comments.error
    }

    let template: string
    try {
        template = await util.promisify(fileSystem.readFile)("./templates/daily.md", { encoding: "utf8" })
    } catch {
        template = ""
    }
    const templateParam = {
        currentDate: moment().format("YYYY/MM/DD"),
        createdTasks: renderTasks(tasks.filter((item) => item.type === "created")),
        reviewTasks: renderTasks(tasks.filter((item) => item.type === "review")),
        otherTasks: renderTasks(tasks.filter((item) => item.type === "other")),
        comments: comments.messages
            .reverse()
            .filter((comment: any) => comment.user === config.slack.user && tasks.every((task) => comment.ts !== task.number))
            .map((comment: any) => "- " + comment.text.replace(/\n/g, "  \n"))
            .join("\n"),
    }
    template = template.replace(/{{\s*?([\w\.]+)\s*}}/g, (match, $1) => {
        return $1.split(".").reduce((current: any, key: string): any => {
            return current[key] ?? []
        }, templateParam)
    })
    const splited = template.split("\n")

    // require("electron").clipboard.writeText(splited.slice(2).join("\n"))
    await request({
        method: "POST",
        uri: "https://api.docbase.io/teams/" + config.daily.domain + "/posts",
        headers: {
            "User-Agent": "taskmanagement v3",
            "X-DocBaseToken": config.daily.token,
            "X-Api-Version": "2",
        },
        body: {
            title: splited[0] || "",
            tags: splited[1]?.split(",") || [],
            body: splited.slice(2).join("\n"),
        },
        json: true,
    })

    return tasks
}

module.exports = (tasks: Task[]): Promise<Task[]> => {
    if (config.daily.type === "docbase") {
        return writeToDocBase(tasks)
    } else {
        throw "unsupported config daily.type " + config.daily.type
    }
}
