package main

import (
	"flag"
	"fmt"
	"os"
	"strings"
)

type Command struct {
	Name        string
	Description string
	Handler     func(*Client, []string) error
}

var commands = map[string]*Command{
	"ls": {
		Name:        "ls",
		Description: "List directory",
		Handler:     handleLs,
	},
	"download": {
		Name:        "download",
		Description: "Download file",
		Handler:     handleDownload,
	},
	"upload": {
		Name:        "upload",
		Description: "Upload file",
		Handler:     handleUpload,
	},
	"mkdir": {
		Name:        "mkdir",
		Description: "Create directory",
		Handler:     handleMkdir,
	},
	"rm": {
		Name:        "rm",
		Description: "Remove file",
		Handler:     handleRm,
	},
	"rmdir": {
		Name:        "rmdir",
		Description: "Remove directory",
		Handler:     handleRmdir,
	},
	"chmod": {
		Name:        "chmod",
		Description: "Change permissions",
		Handler:     handleChmod,
	},
	"stat": {
		Name:        "stat",
		Description: "File status",
		Handler:     handleStat,
	},
	"mv": {
		Name:        "mv",
		Description: "Move/rename",
		Handler:     handleMv,
	},
	"whoami": {
		Name:        "whoami",
		Description: "Show current user",
		Handler:     handleWhoami,
	},
}

func exitErr(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func showRootHelp() {
	fmt.Printf(`Usage: %s [global-options] <command> [command-options] [args]

Global options:
  -k, --insecure    Insecure TLS (skip verify)
  -v, --verbose     Verbose logging
  -h, --help        Show this help

Commands:
`, os.Args[0])
	for _, cmd := range commands {
		fmt.Printf("  %-8s  %s\n", cmd.Name, cmd.Description)
	}
}

func execCommand(client *Client, command string, args []string) {
	cmd, exists := commands[command]
	if !exists {
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", command)
		showRootHelp()
		os.Exit(1)
	}

	exitErr(cmd.Handler(client, args))
}

func parseGlobal() (insecure, verbose bool, rest []string) {
	insecure = false
	verbose = false

	args := os.Args[1:]
	for len(args) > 0 {
		args = expandCombinedShort(args, "kv")
		a := args[0]
		if !strings.HasPrefix(a, "-") {
			break
		}
		switch a {
		case "-k", "--insecure":
			insecure = true
		case "-v", "--verbose":
			verbose = true
		case "-h", "--help":
			showRootHelp()
			os.Exit(0)
		default:
			fmt.Fprintf(os.Stderr, "Unknown global option: %s\n", a)
			os.Exit(1)
		}
		args = args[1:]
	}
	return insecure, verbose, args
}

func handleLs(client *Client, args []string) error {

	args = expandCombinedShort(args, "aelTRj")

	fs := flag.NewFlagSet("ls", flag.ExitOnError)
	all := fs.Bool("a", false, "do not hide entries starting with '.'")
	eff := fs.Bool("e", false, "display effective permissions")
	longf := fs.Bool("l", false, "list in long format")
	timef := fs.Bool("T", false, "With the -l option, show complete date format")
	rec := fs.Bool("R", false, "recursively list subdirectories")
	json := fs.Bool("j", false, "output with json format")

	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("ls requires exactly 1 Gfarm-path")
	}
	return client.cmdLs(rest[0], *all, *eff, *longf, *timef, *rec, *json)
}

func handleDownload(client *Client, args []string) error {
	fs := flag.NewFlagSet("download", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("download requires Gfarm-path and Local-path")
	}
	return client.cmdDownload(rest[0], rest[1])
}

func handleUpload(client *Client, args []string) error {
	fs := flag.NewFlagSet("upload", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("upload requires Local-path and Gfarm-path")
	}
	return client.cmdUpload(rest[0], rest[1])
}

func handleMkdir(client *Client, args []string) error {
	fs := flag.NewFlagSet("mkdir", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("mkdir requires exactly 1 Gfarm-path")
	}
	return client.cmdMkdir(rest[0])
}

func handleRm(client *Client, args []string) error {
	fs := flag.NewFlagSet("rm", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("rm requires exactly 1 Gfarm-path")
	}
	return client.cmdRm(rest[0])
}

func handleRmdir(client *Client, args []string) error {
	fs := flag.NewFlagSet("rmdir", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("rmdir requires exactly 1 Gfarm-path")
	}
	return client.cmdRmdir(rest[0])
}

func handleChmod(client *Client, args []string) error {
	fs := flag.NewFlagSet("chmod", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("chmod requires mode(octal) and Gfarm-path")
	}
	return client.cmdChmod(rest[0], rest[1])
}

func handleStat(client *Client, args []string) error {
	fs := flag.NewFlagSet("stat", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("stat requires exactly 1 Gfarm-path")
	}
	return client.cmdStat(rest[0])
}

func handleMv(client *Client, args []string) error {
	fs := flag.NewFlagSet("mv", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("mv requires source and destination")
	}
	return client.cmdMv(rest[0], rest[1])
}

func handleWhoami(client *Client, args []string) error {
	fs := flag.NewFlagSet("whoami", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	if len(fs.Args()) != 0 {
		return fmt.Errorf("whoami takes no arguments")
	}
	return client.cmdWhoami()
}
