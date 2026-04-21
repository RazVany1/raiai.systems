from pathlib import Path

PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-ui-status.txt")
PATH.write_text(
    "UI polish status:\n- live ops sections active\n- ranking active\n- history active\n- risk monitor active\n- next step: visual refinement if desired\n",
    encoding="utf-8",
)
print(PATH)
