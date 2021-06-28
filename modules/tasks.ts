
const fileSystem = require("fs")
const util = require("util")
const CreatedTask = require("./created-task.js")
const ReviewTask = require("./review-task.js")
const OtherTask = require("./other-task.js")
const writeDaily = require("./write-daily.js")

import { Task } from "./types"

class Tasks {
    private tasks: Task[]

    constructor(tasks: Task[]) {
        this.tasks = tasks
    }

    async reload(): Promise<this> {
        this.tasks = (await Promise.all(this.tasks.map((item) => item.reload())))
            .sort((a, b) => (a.refs?.dueDate ?? 0) - (b.refs?.dueDate ?? 0) || a.createdAt - b.createdAt)
        return this
    }

    find(payload: { type: string, url: string }): Task | undefined {
        return this.tasks.find((item) => item.type === payload.type && item.url === payload.url)
    }

    toArray(): Task[] {
        return this.tasks
    }

    async addCreated(payload: any): Promise<void> {
        this.tasks.push(await CreatedTask.create(payload))
        this.save()
    }

    async addReview(payload: any): Promise<void> {
        if (this.find(payload) !== undefined) {
            throw "already exists"
        }
        this.tasks.push(await ReviewTask.create(payload))
        this.save()
    }

    async addOther(payload: any): Promise<void> {
        this.tasks.push(await OtherTask.create(payload))
        this.save()
    }

    async writeDaily(): Promise<void> {
        await this.reload()
        await writeDaily(this.tasks)
        this.tasks = this.tasks.filter((item) => item.currentIndex < item.todos.length)
        this.save()
    }

    private async save(): Promise<void> {
        await util.promisify(fileSystem.writeFile)("./tasks.json", JSON.stringify(this.tasks), { encoding: "utf8" })
    }

    static async load(): Promise<Tasks> {
        let tasks: any[];
        try {
            tasks = JSON.parse(await util.promisify(fileSystem.readFile)("./tasks.json", { encoding: "utf8" })) || []
        } catch {
            tasks = []
        }

        return await new Tasks(tasks.map((item) => {
            item.previousIndex = item.todos?.findIndex((todo: any) => todo.isDone === " ") ?? 0
            if (item.previousIndex === -1) {
                item.previousIndex = item.todo?.length ?? 0
            }

            switch (item.type) {
                case "created": return new CreatedTask(item)
                case "review": return new ReviewTask(item)
                case "other": return new OtherTask(item)
            }
        })).reload()
    }
}

module.exports = Tasks
