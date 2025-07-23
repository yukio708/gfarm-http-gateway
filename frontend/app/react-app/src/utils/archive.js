import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

/*
class Tar(BaseModel):
    command: str
    basedir: str
    source: List[str]
    outdir: str
    options: List[str] | None
*/
// progressCallbeck({status, value, message, done, onCancel})
async function gfptar(
    command,
    targetDir,
    targetItems,
    destDir,
    options,
    progressCallbeck,
    refresh
) {
    const dlurl = `${API_URL}/gfptar`;

    console.debug("gfptar", options, command, destDir, "-C", targetDir, targetItems);

    const controller = new AbortController();
    const signal = controller.signal;
    const request = {
        method: "POST",
        credentials: "include",
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

    progressCallbeck({
        onCancel: () => {
            controller.abort();
            console.debug("cancel:", destDir);
        },
    });

    try {
        const response = await fetch(dlurl, request);

        if (!response.ok) {
            const error = await response.json();
            const message = get_error_message(response.status, error.detail);
            throw new Error(message, {
                cause: response.status,
            });
        }

        const decoder = new TextDecoder("utf-8");
        const reader = response.body.getReader();
        let buffer = "";
        const indirList = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let lines = buffer.split("\n");
            buffer = lines.pop();
            for (const line of lines) {
                if (line.trim() === "") continue;
                try {
                    const json = JSON.parse(line);
                    if (command === "list") {
                        indirList.push(json.message);
                        progressCallbeck({
                            message: indirList,
                        });
                    } else {
                        progressCallbeck({
                            value: undefined,
                            message: json.message,
                        });
                    }
                } catch (err) {
                    console.warn("Failed to parse line:", line, err);
                }
            }
        }
        progressCallbeck({
            status: "completed",
            message: "",
            value: 100,
            done: true,
        });
        refresh();
    } catch (err) {
        const isAbort = err.name === "AbortError";
        const message = isAbort ? "Download cancelled" : `${err.name} : ${err.message}`;
        progressCallbeck({
            status: isAbort ? "cancelled" : "error",
            message,
            done: true,
        });
        if (isAbort) {
            console.warn("gfptar cancelled", err);
        } else {
            console.error("gfptar failed", err);
        }
    }
}

export default gfptar;
