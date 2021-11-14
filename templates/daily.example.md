
<%
var renderTodos = function (task) {
    var current;

    task.todos
        .slice(task.previousIndex, task.currentIndex)
        .forEach(function (progress) {
%>- [<%= progress.isDone ? "x" : " " %>] <%= progress.name %>
<%
        });

    if (task.currentIndex < task.todos.length) {
        current = task.todos[task.currentIndex];
%>- [<%= current.isDone ? "x" : " " %>] <%= current.name %>
<%
    }
}
%>

## ✅ やったこと・⬜️ やること

### 実装

<%
tasks
    .filter(function (task) {
        return task.type === "created";
    })
    .reduce(function (group, task) {
        group[task.previousIndex < task.currentIndex ? 0 : 1].push(task)
        return group
    },[
        [],
        []
    ])
    .forEach(function (group) {
        group.forEach(function (task) {
%><%= task.title %>
<% renderTodos(task) %>
<%
        })
    });
%>

### レビュー

<%
tasks
    .filter(function (task) {
        return task.type === "review";
    })
    .reduce(function (group, task) {
        if (task.previousIndex < task.currentIndex) {
            group[0].push(task)
        } else if (task.progressable) {
            group[1].push(task)
        }
        return group
    },[
        [],
        []
    ])
    .forEach(function (group) {
        group.forEach(function (task) {
%><%= task.title %>
<% renderTodos(task) %>
<%
        })
    });
%>

### その他

<%
tasks
    .filter(function (task) {
        return task.type === "other";
    })
    .reduce(function (current, task) {
        current[task.previousIndex < task.currentIndex ? 0 : 1].push(task)
        return current
    },[
        [],
        []
    ])
    .forEach(function (group) {
        group.forEach(function (task) {
%><%= task.title %>
<% renderTodos(task) %>
<%
        })
    });
%>


## 所感

<%
comments.forEach(function (comment) {
%><%= comment %>
<%
});
%>
