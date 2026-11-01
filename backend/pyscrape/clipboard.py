import logging
import shutil
import subprocess

import pyperclip

logger = logging.getLogger(__name__)


def copy_text(text: str) -> None:
    try:
        pyperclip.copy(text)
        return
    except pyperclip.PyperclipException as exc:
        logger.debug("pyperclip failed: %s", exc)

    commands = []
    if shutil.which("xclip"):
        commands.append(["xclip", "-selection", "clipboard"])
    if shutil.which("xsel"):
        commands.append(["xsel", "--clipboard", "--input"])
    if shutil.which("pbcopy"):
        commands.append(["pbcopy"])
    if shutil.which("clip.exe"):
        commands.append(["clip.exe"])
    for command in commands:
        try:
            subprocess.run(
                command,
                input=text,
                text=True,
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
            return
        except (OSError, subprocess.CalledProcessError) as exc:
            logger.debug("%s failed: %s", command[0], exc)
    raise RuntimeError(
        "Clipboard unavailable. Install a clipboard backend "
        "(Linux: xclip or xsel), or use --output FILE."
    )
