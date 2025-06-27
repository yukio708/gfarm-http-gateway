import { API_URL } from "./api_url";

/*
class Tar(BaseModel):
    command: str
    basedir: str
    source: List[str]
    outdir: str
    options: List[str] | None
*/
async function gfptar(command, targetDir, targetItems, destDir, options, setTasks) {
    const dlurl = `${API_URL}/gfptar`;
    const taskId = targetItems.join(",") + Date.now();
    const displayname = taskId.length > 20 ? taskId.slice(0, 10) + "..." : taskId;

    console.debug("gfptar", options, command, destDir, "-C", targetDir, targetItems);

    let cmd;
    if (command === "list") {
        cmd = "t";
    } else if (command === "compress") {
        cmd = "c";
    } else if (command === "extract") {
        cmd = "x";
    } else {
        return "Error: unknown command";
    }

    const controller = new AbortController();
    const signal = controller.signal;
    const request = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            command: cmd,
            basedir: "gfarm:" + targetDir,
            source: targetItems.map((item) => "./" + item.name),
            outdir: "gfarm:" + destDir,
            options,
        }),
        signal,
    };

    const newTask = {
        taskId,
        name: displayname,
        value: 0,
        type: "gfptar",
        status: command,
        message: "",
        onCancel: () => {
            controller.abort();
            console.debug("cancel:", taskId);
        },
    };
    setTasks((prev) => [...prev, newTask]);

    try {
        const response = await fetch(dlurl, request);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const decoder = new TextDecoder("utf-8");
        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);

            const message = decoder.decode(value, { stream: true });
            setTasks((prev) =>
                prev.map((task) =>
                    task.taskId === taskId ? { ...task, value: undefined, message } : task
                )
            );
        }

        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? {
                          ...task,
                          status: "completed",
                          message: "",
                          value: 100,
                          done: true,
                      }
                    : task
            )
        );
    } catch (err) {
        const isAbort = err.name === "AbortError";
        const message = isAbort ? "Download cancelled" : `${err.name}: ${err.message}`;
        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? {
                          ...task,
                          status: isAbort ? "cancelled" : "error",
                          message,
                          done: true,
                      }
                    : task
            )
        );
        if (isAbort) {
            console.warn("gfptar cancelled", err);
        } else {
            console.error("gfptar failed", err);
        }
    }
}

export default gfptar;
