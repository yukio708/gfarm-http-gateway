import { API_URL } from "./config";

/*
class Tar(BaseModel):
    command: str
    basedir: str
    source: List[str]
    outdir: str
    options: List[str] | None
*/
async function gfptar(command, targetDir, targetItems, destDir, options, setTasks, refresh) {
    const dlurl = `${API_URL}/gfptar`;
    const taskId = destDir + Date.now();
    const displayname = destDir;

    console.debug("gfptar", options, command, destDir, "-C", targetDir, targetItems);

    const controller = new AbortController();
    const signal = controller.signal;
    const request = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            command,
            basedir: "gfarm:" + targetDir,
            source: targetItems,
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
            const error = await response.json();
            const message = JSON.stringify(error.detail);
            throw new Error(`${response.status} ${message}`, {
                cause: response.status,
            });
        }

        const decoder = new TextDecoder("utf-8");
        const reader = response.body.getReader();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let lines = buffer.split("\n");
            buffer = lines.pop(); // Save last partial line back to buffer
            for (const line of lines) {
                if (line.trim() === "") continue;
                try {
                    const json = JSON.parse(line);
                    // console.log("Streamed message:", json.message);

                    setTasks((prev) =>
                        prev.map((task) =>
                            task.taskId === taskId
                                ? { ...task, value: undefined, message: json.message }
                                : task
                        )
                    );
                } catch (err) {
                    console.warn("Failed to parse line:", line, err);
                }
            }
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
        refresh();
    } catch (err) {
        const isAbort = err.name === "AbortError";
        const message = isAbort ? "Download cancelled" : `${err.name} : ${err.message}`;
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
