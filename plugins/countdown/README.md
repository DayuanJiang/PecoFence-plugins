# Countdown

Shows how many days are left until the dates you care about, nearest first. Dates that have passed
show how long ago they were.

The list is a text file in the fence's own data folder, one date per line:

```
2026-12-25 Christmas
2027-01-01 New Year
```

Click any row to open the file in your text editor; the fence shows the change at its next run
(every 30 minutes, or right away with 立即运行 in the fence menu).

Sends nothing over the network and asks for no permissions. Reads and writes only its own data folder.
