
export interface Task {
    type: "created" | "review" | "other"
    number: string
    title: string
    url: string
    createdAt: number
    refs?: Refs
    todos: {
        name: string
        isDone: " " | "x"
    }[]
    currentIndex: number
    previousIndex: number
    progressable: boolean

    reload(): Promise<this>
    checkout(): Promise<this>
    openEditor(): Promise<this>
    openWeb(): Promise<this>
}

export interface Refs {
    url?: string
    title: string
    dueDate?: number
    dueDateFromNow?: string
    priority: number
}
