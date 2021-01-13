"starting main server ..."
Start-Process -FilePath "node" -ArgumentList "./bin/main.js" -WorkingDirectory "./" -NoNewWindow -Wait -RedirectStandardError "error.log"