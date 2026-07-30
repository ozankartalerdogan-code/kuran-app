#!/usr/bin/env python3
"""Public v2 helper module with the frozen v1 summary hash correction."""

from __future__ import annotations

import v2_common_base as _base
from v2_common_base import *  # noqa: F401,F403


EXPECTED_V1_SUMMARY_SHA256 = "d83e6ee419b3d6f9169fc02b02dc54e8ed32ddbc65eb0d6507605bbc6c3e3b7b"
_base.EXPECTED_V1_SUMMARY_SHA256 = EXPECTED_V1_SUMMARY_SHA256
_base.V1_FROZEN_EXPECTED["data/candidates/morphology/reports/disambiguation-poc-summary.json"] = EXPECTED_V1_SUMMARY_SHA256
V1_FROZEN_EXPECTED = _base.V1_FROZEN_EXPECTED
