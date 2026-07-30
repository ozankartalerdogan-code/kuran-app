#!/usr/bin/env python3
"""Public v2 helpers with task-start protected-file hashes."""

from __future__ import annotations

import v2_common_overlay1 as _overlay
from v2_common_overlay1 import *  # noqa: F401,F403


PROTECTED_EXPECTED = dict(_overlay.PROTECTED_EXPECTED)
PROTECTED_EXPECTED["data/vendor/tanzil/uthmani-1.1/manifest.json"] = "f9a7594c988b58718041b86e52aef473308136ce83959aa2249986a1cf2c5efb"
PROTECTED_EXPECTED["data/app.db"] = "f00a3864c59282c91a187438c499687412d044d083987240d502414d80ac7208"
_overlay.PROTECTED_EXPECTED = PROTECTED_EXPECTED
