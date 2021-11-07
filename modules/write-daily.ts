
const ejs = require("ejs")
const fileSystem = require("fs")
const moment = require("moment")
moment.locale("ja")
const request = require("request-promise")
const util = require("util")

const config = require("../config.json")

import { Task } from "./types"

module.exports = async (tasks: Task[]): Promise<Task[]> => {
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
        if (comments.error !== 'invalid_auth') {
            throw comments.error
        }
        comments.messages = []
    }

    const body = await ejs.renderFile(
        "./templates/daily.md",
        {
            tasks,
            comments: comments.messages
                .filter((comment: any) => comment.user === config.slack.user)
                .map((comment: any) => comment.text.replace(/\n/g, "  \n"))
                .reverse(),
        }
    )

    if (config.daily.type === "docbase") {
        await request({
            method: "POST",
            uri: "https://api.docbase.io/teams/" + config.daily.domain + "/posts",
            headers: {
                "User-Agent": "taskmanagement v3",
                "X-DocBaseToken": config.daily.token,
                "X-Api-Version": "2",
            },
            body: {
                title: config.daily.title,
                tags: config.daily.tags,
                body,
            },
            json: true,
        })
    } else if (config.daily.type === "file") {
        await util.promisify(fileSystem.writeFile)(
            config.daily.path + "/" + moment().format(config.daily.title),
            body,
            {
                encoding: "utf8",
                flag: "wx", // 上書きを防ぐ
            }
        )
    } else {
        throw "unsupported config daily.type " + config.daily.type
    }

    return tasks
}
