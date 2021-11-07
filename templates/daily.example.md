
<%
var renderTodos = function (task) {
    var current;

    task.todos
        .slice(task.previousIndex, task.currentIndex)
        .forEach(function (progress) {
%>- [<%= progress.isDone %>] <%= progress.name %>
<%
        });

    if (task.currentIndex < task.todos.length) {
        current = task.todos[task.currentIndex];
%>- [<%= current.isDone %>] <%= current.name %>
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
    .forEach(function (task) {
%><%= task.title %>
<% renderTodos(task) %>
<%
    });
%>

### レビュー

<%
tasks
    .filter(function (task) {
        return task.type === "review"
            && task.pogressable;
            // todo
    })
    .forEach(function (task) {
%><%= task.title %>
<% renderTodos(task) %>
<%
    });
%>

### その他

<%
tasks
    .filter(function (task) {
        return task.type === "other";
    })
    .forEach(function (task) {
%><%= task.title %>
<% renderTodos(task) %>
<%
    });
%>


## 所感

<%
comments.forEach(function (comment) {
%><%= comment %>
<%
});
%>
