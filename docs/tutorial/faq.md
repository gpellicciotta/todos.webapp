# Frequently Asked Questions

Find quick answers here. Each answer matches how the app works today.

## Do I need an account to use ToDo's?
No. ToDo's works fully without an account, and you stay anonymous.
You need an account only to [connect](https://todos.pellicciotta.com/#/connect), which syncs across devices and shares lists. Access to accounts is by invitation.

## Where are my lists and tasks stored?
On your device, in your browser's storage, until you connect.
Nothing is sent anywhere in local mode.
Clearing your browser data erases them, so [export a backup](https://todos.pellicciotta.com/#/settings?section=data) now and then.

## How do I sync my tasks across devices?
Open [Settings, Connection](https://todos.pellicciotta.com/#/connect) and choose **Sign in**.
Sign in with the same account on each device.
Changes you make offline wait in a queue and sync when the network returns.

## How do I back up or move my data?
[Settings, Data](https://todos.pellicciotta.com/#/settings?section=data) has **Export backup** and **Import backup**.
Export saves one file named like `todos-backup-2026-12-24.json`.
Import it on another device, in merge mode to combine it with existing data, or in overwrite mode to replace it.
The app shows counts of what will change before it applies an import.

## What can I type in the add field?
Type the task in [All tasks](https://todos.pellicciotta.com/#/tasks) or in a list, then add any of these:
- Dates: `today`, `tomorrow`, a full weekday name such as `friday`, or `2026-12-24`.
- Times: `18:00`, `6 pm`, `6pm`, or `6:30 am`.
- Lists: `#home` adds the task to the list named Home, if you may add tasks to it.
- A backslash keeps a word as text, such as `\tomorrow` or `\#home`.

For example, `Buy brushes tomorrow 18:00 #home`.
A date alone means 23:59 that day. A preview line shows what Add will set.

## How do I search, filter, group, or sort tasks?
Type in the search and add field to filter by description or notes.
For more, choose ![the actions button](img/icons/more-vertical.svg) in the top bar, then [Edit view options](https://todos.pellicciotta.com/#/tasks/view-options).
Filter by list, status, due date, or creation date.
Group by list, due date, or status, and sort in either direction.
**Reset** puts every option back to its default.

## Why does Enter add a task, and how can it only search?
`Enter` adds the task, so a shopping list takes one key per item.
To make `Enter` only search, turn off **Make Enter add** in [Settings, Adding tasks](https://todos.pellicciotta.com/#/settings?section=adding).
`Shift+Enter` and `Alt+Enter` always add.

## What do the status icons mean?
| Icon                                             | Status      | What it means                                           |
|:-------------------------------------------------|:------------|:--------------------------------------------------------|
| ![To do](img/icons/status-ready.svg)             | To do       | Open, and not started yet.                              |
| ![In progress](img/icons/status-in-progress.svg) | In progress | Started. It turns orange when the task is not on track. |
| ![Completed](img/icons/status-completed.svg)     | Completed   | The goal is met.                                        |
| ![Failed](img/icons/status-failed.svg)           | Failed      | The time window closed before the goal was met.         |
| ![Cancelled](img/icons/status-cancelled.svg)     | Cancelled   | You dropped the task.                                   |
| ![Upcoming](img/icons/status-upcoming.svg)       | Upcoming    | It starts later, so it takes no logs yet.               |

## How do repeating tasks and target counts work?
In the task editor, make a task repeat daily, weekly, monthly, or yearly, every 1 to 99 units. ![](img/icons/repeat.svg)
It comes back as *To do* each period, and it can end on a date or after a number of periods.
A task can ask for several checks. Each click on its status button counts one, and the row shows a count like `1/3`.
A goal in time, amounts, or readings shows a small meter and its progress, and its status button opens a quick log under the row.
After each log, a toast offers Undo.

## What happens when a task becomes overdue?
An open task is overdue once its due time passes. ![](img/icons/clock.svg)
The row shows its due text in orange, and the task stays open, so you can still tick it off.
With **When overdue** set to **Fail**, it becomes ![](img/icons/status-failed.svg) Failed instead.

## How do reminders work?
Reminders are off by default.
Turn on **Remind me when tasks come due** in [Settings, Reminders](https://todos.pellicciotta.com/#/settings?section=reminders), and allow notifications when your browser asks.
ToDo's notifies you while it is open in a browser tab.
A task with a date only reminds at 9:00 that day.
While you are connected, reminders also arrive with ToDo's closed, up to 4 hours before the task is due; the notification names the due time.
On an iPhone or iPad this needs ToDo's added to the Home Screen.

## How do I share a list?
Sharing needs a connection, so [connect](https://todos.pellicciotta.com/#/connect) first.
Open the list from [Lists](https://todos.pellicciotta.com/#/lists), choose ![the actions button](img/icons/more-vertical.svg) and then **Share list**, and enter an email address and a role.
Viewers can only look at the list, task editors can also work on its tasks, and editors can also edit the list.

## What happens when I delete a task or a list?
It goes to the ![](img/icons/bin.svg) [recycle bin](https://todos.pellicciotta.com/#/bin), where you can restore it for 30 days.
After 30 days, ToDo's deletes it for good.
Deleting a list never deletes its tasks.

## How do I install ToDo's on my phone or computer?
Use your browser's install option, such as **Install app** in the address bar menu, or **Add to Home Screen** on a phone.
The installed app starts and works without a network.

## How do I get a new version of the app?
When a new version is ready, the app offers an **Update** button.
Choose it to switch, so your open tabs never mix old and new versions.

## Which keyboard shortcuts can I use?
Single keys, such as `n` and `x`, work while you are not typing in a field.

| Keys                         | Where                             | What happens                                              |
|:-----------------------------|:----------------------------------|:----------------------------------------------------------|
| `n` or `/`                   | Task views                        | Jump to the search and add field.                         |
| `/`                          | Lists, with a find field          | Jump to the find field.                                   |
| `l`                          | Any screen                        | Jump to the find field of the sidebar, or open Lists.     |
| `Enter`                      | Search and add field              | Add the task while **Make Enter add** is on, else search. |
| `Shift+Enter` or `Alt+Enter` | Search and add field              | Add the task.                                             |
| `Enter`                      | Find field on Lists               | Open the first matching list.                             |
| `x`                          | A focused task                    | Click its status button; a toast offers Undo.             |
| `Up` or `Down`               | Lists                             | Move to the previous or next list.                        |
| `Alt+Up` or `Alt+Down`       | A list, or a task in manual order | Move it up or down.                                       |
| `Alt+Home` or `Alt+End`      | A list, or a task in manual order | Move it to the top or bottom.                             |
| `Left` or `Right`            | Tabs of the task editor           | Switch to the next tab.                                   |
| `Escape`                     | A field, panel, or dialog         | Clear the search field, or close the panel or dialog.     |
| `Ctrl+Z` or `Cmd+Z`          | Any screen                        | Undo the newest change shown in a toast.                  |

## Where can I report a problem or suggest an idea?
Use the **Report a problem** link in [Application Info & Support](https://todos.pellicciotta.com/#/help?topic=info).
