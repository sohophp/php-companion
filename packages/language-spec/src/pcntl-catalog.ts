// Names generated from JetBrains/phpstorm-stubs e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, pcntl/.
// Signatures checked against local PHP 7.2-8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const PCNTL_FUNCTION_NAMES = ["pcntl_alarm","pcntl_async_signals","pcntl_errno","pcntl_exec","pcntl_fork","pcntl_get_last_error","pcntl_getcpu","pcntl_getcpuaffinity","pcntl_getpriority","pcntl_setcpuaffinity","pcntl_setpriority","pcntl_signal","pcntl_signal_dispatch","pcntl_signal_get_handler","pcntl_sigprocmask","pcntl_sigtimedwait","pcntl_sigwaitinfo","pcntl_strerror","pcntl_unshare","pcntl_wait","pcntl_waitid","pcntl_waitpid","pcntl_wexitstatus","pcntl_wifcontinued","pcntl_wifexited","pcntl_wifsignaled","pcntl_wifstopped","pcntl_wstopsig","pcntl_wtermsig"] as const;
export const PCNTL_CONSTANT_NAMES = ["BUS_ADRALN","BUS_ADRERR","BUS_OBJERR","CLD_CONTINUED","CLD_DUMPED","CLD_EXITED","CLD_KILLED","CLD_STOPPED","CLD_TRAPPED","CLONE_NEWCGROUP","CLONE_NEWIPC","CLONE_NEWNET","CLONE_NEWNS","CLONE_NEWPID","CLONE_NEWUSER","CLONE_NEWUTS","FPE_FLTDIV","FPE_FLTINV","FPE_FLTOVF","FPE_FLTRES","FPE_FLTSUB","FPE_FLTUND","FPE_INTDIV","FPE_INTOVF","ILL_BADSTK","ILL_COPROC","ILL_ILLADR","ILL_ILLOPC","ILL_ILLOPN","ILL_ILLTRP","ILL_PRVOPC","ILL_PRVREG","P_ALL","P_PGID","P_PID","P_PIDFD","PCNTL_E2BIG","PCNTL_EACCES","PCNTL_EAGAIN","PCNTL_ECHILD","PCNTL_EFAULT","PCNTL_EINTR","PCNTL_EINVAL","PCNTL_EIO","PCNTL_EISDIR","PCNTL_ELIBBAD","PCNTL_ELOOP","PCNTL_EMFILE","PCNTL_ENAMETOOLONG","PCNTL_ENFILE","PCNTL_ENOENT","PCNTL_ENOEXEC","PCNTL_ENOMEM","PCNTL_ENOSPC","PCNTL_ENOTDIR","PCNTL_EPERM","PCNTL_ESRCH","PCNTL_ETXTBSY","PCNTL_EUSERS","POLL_ERR","POLL_HUP","POLL_IN","POLL_MSG","POLL_OUT","POLL_PRI","PRIO_PGRP","PRIO_PROCESS","PRIO_USER","SEGV_ACCERR","SEGV_MAPERR","SI_ASYNCIO","SI_KERNEL","SI_MESGQ","SI_QUEUE","SI_SIGIO","SI_TIMER","SI_TKILL","SI_USER","SIG_BLOCK","SIG_DFL","SIG_ERR","SIG_IGN","SIG_SETMASK","SIG_UNBLOCK","SIGABRT","SIGALRM","SIGBABY","SIGBUS","SIGCHLD","SIGCLD","SIGCONT","SIGFPE","SIGHUP","SIGILL","SIGINT","SIGIO","SIGIOT","SIGKILL","SIGPIPE","SIGPOLL","SIGPROF","SIGPWR","SIGQUIT","SIGRTMAX","SIGRTMIN","SIGSEGV","SIGSTKFLT","SIGSTOP","SIGSYS","SIGTERM","SIGTRAP","SIGTSTP","SIGTTIN","SIGTTOU","SIGURG","SIGUSR1","SIGUSR2","SIGVTALRM","SIGWINCH","SIGXCPU","SIGXFSZ","TRAP_BRKPT","TRAP_TRACE","WCONTINUED","WEXITED","WNOHANG","WNOWAIT","WSTOPPED","WUNTRACED"] as const;
export const PCNTL_SIGNATURE_SNAPSHOTS = {
  "702": {
    "pcntl_alarm": {
      "parameters": [
        {
          "name": "seconds",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_async_signals": {
      "parameters": [
        {
          "name": "on",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_errno": {
      "parameters": [],
      "return": null
    },
    "pcntl_exec": {
      "parameters": [
        {
          "name": "path",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "args",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "envs",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_fork": {
      "parameters": [],
      "return": null
    },
    "pcntl_get_last_error": {
      "parameters": [],
      "return": null
    },
    "pcntl_getpriority": {
      "parameters": [
        {
          "name": "pid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "process_identifier",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_setpriority": {
      "parameters": [
        {
          "name": "priority",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "pid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "process_identifier",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_signal": {
      "parameters": [
        {
          "name": "signo",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "handler",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "restart_syscalls",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_signal_dispatch": {
      "parameters": [],
      "return": null
    },
    "pcntl_signal_get_handler": {
      "parameters": [
        {
          "name": "signo",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_sigprocmask": {
      "parameters": [
        {
          "name": "how",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "set",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oldset",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_sigtimedwait": {
      "parameters": [
        {
          "name": "set",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "seconds",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "nanoseconds",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_sigwaitinfo": {
      "parameters": [
        {
          "name": "set",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_strerror": {
      "parameters": [
        {
          "name": "errno",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wait": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "options",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "rusage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_waitpid": {
      "parameters": [
        {
          "name": "pid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "options",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "rusage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wexitstatus": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wifcontinued": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wifexited": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wifsignaled": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wifstopped": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wstopsig": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wtermsig": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    }
  },
  "704": {
    "pcntl_alarm": {
      "parameters": [
        {
          "name": "seconds",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_async_signals": {
      "parameters": [
        {
          "name": "on",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_errno": {
      "parameters": [],
      "return": null
    },
    "pcntl_exec": {
      "parameters": [
        {
          "name": "path",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "args",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "envs",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_fork": {
      "parameters": [],
      "return": null
    },
    "pcntl_get_last_error": {
      "parameters": [],
      "return": null
    },
    "pcntl_getpriority": {
      "parameters": [
        {
          "name": "pid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "process_identifier",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_setpriority": {
      "parameters": [
        {
          "name": "priority",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "pid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "process_identifier",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_signal": {
      "parameters": [
        {
          "name": "signo",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "handler",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "restart_syscalls",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_signal_dispatch": {
      "parameters": [],
      "return": null
    },
    "pcntl_signal_get_handler": {
      "parameters": [
        {
          "name": "signo",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_sigprocmask": {
      "parameters": [
        {
          "name": "how",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "set",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "oldset",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_sigtimedwait": {
      "parameters": [
        {
          "name": "set",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "seconds",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "nanoseconds",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_sigwaitinfo": {
      "parameters": [
        {
          "name": "set",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_strerror": {
      "parameters": [
        {
          "name": "errno",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_unshare": {
      "parameters": [
        {
          "name": "flags",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wait": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "options",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "rusage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_waitpid": {
      "parameters": [
        {
          "name": "pid",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "options",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "rusage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wexitstatus": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wifcontinued": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wifexited": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wifsignaled": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wifstopped": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wstopsig": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_wtermsig": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    }
  },
  "801": {
    "pcntl_alarm": {
      "parameters": [
        {
          "name": "seconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_async_signals": {
      "parameters": [
        {
          "name": "enable",
          "type": "?bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_errno": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_exec": {
      "parameters": [
        {
          "name": "path",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "args",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "env_vars",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_fork": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_get_last_error": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_getpriority": {
      "parameters": [
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": "PRIO_PROCESS"
        }
      ],
      "return": "int|false"
    },
    "pcntl_setpriority": {
      "parameters": [
        {
          "name": "priority",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": "PRIO_PROCESS"
        }
      ],
      "return": "bool"
    },
    "pcntl_signal": {
      "parameters": [
        {
          "name": "signal",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "handler",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "restart_syscalls",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": true,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_signal_dispatch": {
      "parameters": [],
      "return": "bool"
    },
    "pcntl_signal_get_handler": {
      "parameters": [
        {
          "name": "signal",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_sigprocmask": {
      "parameters": [
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "old_signals",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_sigtimedwait": {
      "parameters": [
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "seconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "nanoseconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_sigwaitinfo": {
      "parameters": [
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_strerror": {
      "parameters": [
        {
          "name": "error_code",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pcntl_unshare": {
      "parameters": [
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wait": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "resource_usage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_waitpid": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "resource_usage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_wexitstatus": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_wifcontinued": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifexited": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifsignaled": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifstopped": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wstopsig": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_wtermsig": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    }
  },
  "802": {
    "pcntl_alarm": {
      "parameters": [
        {
          "name": "seconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_async_signals": {
      "parameters": [
        {
          "name": "enable",
          "type": "?bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_errno": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_exec": {
      "parameters": [
        {
          "name": "path",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "args",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "env_vars",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_fork": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_get_last_error": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_getpriority": {
      "parameters": [
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": "PRIO_PROCESS"
        }
      ],
      "return": "int|false"
    },
    "pcntl_setpriority": {
      "parameters": [
        {
          "name": "priority",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": "PRIO_PROCESS"
        }
      ],
      "return": "bool"
    },
    "pcntl_signal": {
      "parameters": [
        {
          "name": "signal",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "handler",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "restart_syscalls",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": true,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_signal_dispatch": {
      "parameters": [],
      "return": "bool"
    },
    "pcntl_signal_get_handler": {
      "parameters": [
        {
          "name": "signal",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_sigprocmask": {
      "parameters": [
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "old_signals",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_sigtimedwait": {
      "parameters": [
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "seconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "nanoseconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_sigwaitinfo": {
      "parameters": [
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_strerror": {
      "parameters": [
        {
          "name": "error_code",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pcntl_unshare": {
      "parameters": [
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wait": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "resource_usage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_waitpid": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "resource_usage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_wexitstatus": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_wifcontinued": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifexited": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifsignaled": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifstopped": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wstopsig": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_wtermsig": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    }
  },
  "804": {
    "pcntl_alarm": {
      "parameters": [
        {
          "name": "seconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_async_signals": {
      "parameters": [
        {
          "name": "enable",
          "type": "?bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_errno": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_exec": {
      "parameters": [
        {
          "name": "path",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "args",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "env_vars",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_fork": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_get_last_error": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_getcpu": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_getcpuaffinity": {
      "parameters": [
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pcntl_getpriority": {
      "parameters": [
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": "PRIO_PROCESS"
        }
      ],
      "return": "int|false"
    },
    "pcntl_setcpuaffinity": {
      "parameters": [
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "cpu_ids",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_setpriority": {
      "parameters": [
        {
          "name": "priority",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": "PRIO_PROCESS"
        }
      ],
      "return": "bool"
    },
    "pcntl_signal": {
      "parameters": [
        {
          "name": "signal",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "handler",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "restart_syscalls",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": true,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_signal_dispatch": {
      "parameters": [],
      "return": "bool"
    },
    "pcntl_signal_get_handler": {
      "parameters": [
        {
          "name": "signal",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_sigprocmask": {
      "parameters": [
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "old_signals",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_sigtimedwait": {
      "parameters": [
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "seconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "nanoseconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_sigwaitinfo": {
      "parameters": [
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_strerror": {
      "parameters": [
        {
          "name": "error_code",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pcntl_unshare": {
      "parameters": [
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wait": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "resource_usage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_waitid": {
      "parameters": [
        {
          "name": "idtype",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": "P_ALL"
        },
        {
          "name": "id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 4,
          "defaultConstant": "WEXITED"
        }
      ],
      "return": "bool"
    },
    "pcntl_waitpid": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "resource_usage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_wexitstatus": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_wifcontinued": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifexited": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifsignaled": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifstopped": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wstopsig": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_wtermsig": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    }
  },
  "805": {
    "pcntl_alarm": {
      "parameters": [
        {
          "name": "seconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_async_signals": {
      "parameters": [
        {
          "name": "enable",
          "type": "?bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_errno": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_exec": {
      "parameters": [
        {
          "name": "path",
          "type": "string",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "args",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "env_vars",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "false"
    },
    "pcntl_fork": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_get_last_error": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_getcpu": {
      "parameters": [],
      "return": "int"
    },
    "pcntl_getcpuaffinity": {
      "parameters": [
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "array|false"
    },
    "pcntl_getpriority": {
      "parameters": [
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": "PRIO_PROCESS"
        }
      ],
      "return": "int|false"
    },
    "pcntl_setcpuaffinity": {
      "parameters": [
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "cpu_ids",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_setpriority": {
      "parameters": [
        {
          "name": "priority",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "process_id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": "PRIO_PROCESS"
        }
      ],
      "return": "bool"
    },
    "pcntl_signal": {
      "parameters": [
        {
          "name": "signal",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "handler",
          "type": null,
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "restart_syscalls",
          "type": "bool",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": true,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_signal_dispatch": {
      "parameters": [],
      "return": "bool"
    },
    "pcntl_signal_get_handler": {
      "parameters": [
        {
          "name": "signal",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": null
    },
    "pcntl_sigprocmask": {
      "parameters": [
        {
          "name": "mode",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "old_signals",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_sigtimedwait": {
      "parameters": [
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "seconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "nanoseconds",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_sigwaitinfo": {
      "parameters": [
        {
          "name": "signals",
          "type": "array",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_strerror": {
      "parameters": [
        {
          "name": "error_code",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "string"
    },
    "pcntl_unshare": {
      "parameters": [
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wait": {
      "parameters": [
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "resource_usage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_waitid": {
      "parameters": [
        {
          "name": "idtype",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": "P_ALL"
        },
        {
          "name": "id",
          "type": "?int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "info",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 4,
          "defaultConstant": "WEXITED"
        },
        {
          "name": "resource_usage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_waitpid": {
      "parameters": [
        {
          "name": "process_id",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "status",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        },
        {
          "name": "flags",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": true,
          "default": 0,
          "defaultConstant": null
        },
        {
          "name": "resource_usage",
          "type": null,
          "byRef": true,
          "variadic": false,
          "optional": true,
          "default": [],
          "defaultConstant": null
        }
      ],
      "return": "int"
    },
    "pcntl_wexitstatus": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_wifcontinued": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifexited": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifsignaled": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wifstopped": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "bool"
    },
    "pcntl_wstopsig": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    },
    "pcntl_wtermsig": {
      "parameters": [
        {
          "name": "status",
          "type": "int",
          "byRef": false,
          "variadic": false,
          "optional": false,
          "default": null,
          "defaultConstant": null
        }
      ],
      "return": "int|false"
    }
  }
} as const;
