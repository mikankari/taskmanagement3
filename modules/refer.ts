
const moment = require("moment")
moment.locale("ja")
const request = require("request-promise")

const config = require("../config.json")

import { Refs } from "./types"

const loadFromGitHub = async (repo: string, number: string): Promise<Refs> => {
    const data = await request({
        uri: "https://api.github.com/repos/" + repo + "/issues/" + number,
        headers: {
            "User-Agent": "taskmanagement v3",
            "Authorization": "token " + config.github.token,
        },
        json: true,
    })
    const dueDate = data.milestone && moment(data.milestone.due_on)
    return {
        type: "github_issue",
        repo,
        number,
        title: data.title,
        dueDate: dueDate?.valueOf(),
        dueDateFromNow: dueDate?.fromNow(),
        priority: 0,
    }
}

const loadFromRedmine = async (number: string): Promise<Refs> => {
    const data = await request({
        uri: config.redmine.baseUrl + "issues/" + number + ".json",
        headers: {
            "User-Agent": "taskmanagement v3",
            "X-Redmine-API-Key": config.redmine.token,
        },
        json: true,
    })
    const dueDate = data.issue.due_date && moment(data.issue.due_date)
    return {
        type: "redmine",
        number,
        title: data.issue.subject,
        dueDate: dueDate?.valueOf(),
        dueDateFromNow: dueDate?.fromNow(),
        priority: (() => {
            switch (data.issue.priority.id) {
                case 1: return -1 // 低め
                case 2: return 0 // 通常
                case 3: return 1 // 高め
                case 4: return 2 // 急いで
                case 5: return 2 // 今すぐ
                default: return 0
            }
        })(),
    }
}

module.exports = async (url: string): Promise<Refs | undefined> => {
    let matches
    if (! url) {
        return undefined
    }
    if (matches = url.match(/\/\/github\.com\/(\w+\/\w+)\/issues\/(\d+)/)) {
        const refs = await loadFromGitHub(matches[1], matches[2])
        return Object.assign({ url }, refs)
    } else if (matches = url.match(new RegExp(config.redmine.baseUrl + "issues/(\\d+)"))) {
        const refs = await loadFromRedmine(matches[1])
        return Object.assign({ url }, refs)
    } else {
        return undefined
    }
}
