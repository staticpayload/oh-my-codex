export const HELP_TEXT = `OMX v2

Usage:
  omx <command> [options]

Commands:
  omx setup [apply|repair|uninstall|migrate-v1] [--dry-run] [--force] [--no-plugin] [--no-hooks]
  omx doctor [--json]
  omx hud [--json] [--watch]
  omx team <init|status|spawn|queue|claim|heartbeat|complete|review|message|await|inbox|logs|resume|shutdown>
  omx explore <search|diff|files|symbols|anchors|index|refs|rename-preview|replace-preview|diagnostics|tmux>
  omx session <status|start|resume|stop>
  omx autoresearch <init|status|log>
  omx agents <list|show|install|validate>
  omx plugins <init|pack|validate|install-local|list|enable|disable|doctor>
  omx hooks <install|enable|disable|status|doctor|explain>
  omx version

Default path:
  Use $ultrawork inside Codex to activate the full interview -> plan -> execute -> verify flow.`;
