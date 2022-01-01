
Vue.createApp {
    data: -> {
        tasks: []
        directories: []
        isShowAll: false
        isShownCreatingModal: false
        isShownReviewModal: false
        isShownOtherModal: false
        checkedoutTask: null
    }
    methods: {
        reload: ->
            window.ipcRenderer.invoke "get-tasks"
                .then (tasks) => @tasks = tasks
                .catch (error) -> window.alert error

        checkout: (task) ->
            window.ipcRenderer.invoke "checkout", Vue.toRaw task
                .then => @checkedoutTask = task
                .catch (error) -> window.alert error

        openIssue: (task) ->
            window.ipcRenderer.invoke "open-issue", Vue.toRaw task
                .catch (error) -> window.alert error

        openPR: (task) ->
            window.ipcRenderer.invoke "open-pr", Vue.toRaw task
                .catch (error) -> window.alert error

        submitCreating: (event) ->
            @isShownCreatingModal = false
            return if event.submitter.classList.contains "cancel"

            window.ipcRenderer.invoke "add-creating", {
                repo: event.target.elements.namedItem "repo"
                    .value
                refs: {
                    url: event.target.elements.namedItem "refs[url]"
                        .value
                }
                head: event.target.elements.namedItem "head"
                    .value
                base: event.target.elements.namedItem "base"
                    .value
            }
                .then () -> window.alert "Done"
                .catch (error) -> window.alert error

        submitReview: (event) ->
            @isShownReviewModal = false
            return if event.submitter.classList.contains "cancel"

            window.ipcRenderer.invoke "add-review", {
                url: event.target.elements.namedItem "url"
                    .value
            }
                .then () -> window.alert "Done"
                .catch (error) -> window.alert error

        submitOther: (event) ->
            @isShownOtherModal = false
            return if event.submitter.classList.contains "cancel"

            window.ipcRenderer.invoke "add-other", {
                refs: {
                    url: event.target.elements.namedItem "refs[url]"
                        .value
                    dueDate: event.target.elements.namedItem "refs[dueDate]"
                        .value
                }
                todos: event.target.elements.namedItem "todos"
                    .value
            }
                .then -> window.alert "Done"
                .catch (error) -> window.alert error

        copy: ->
            window.clipboard.writeText(
                @tasks.map (item) -> [
                        "- [#{item.title}](#{item.url})"
                        "  - #{item.todos[item.currentIndex]?.name or "＼ｵﾜﾀ／"}"
                        ""
                    ].join "\n"
                .join "\n"
            )

        writeDiary: ->
            return if not window.confirm "Are you sure?"

            window.ipcRenderer.invoke "write-diary"
                .then -> window.alert "Done"
                .catch (error) -> window.alert error
    }
    created: ->
        @reload()
        window.ipcRenderer.invoke "get-directories"
            .then (directories) => @directories = directories
}
    .mount "#taskmanagement"
