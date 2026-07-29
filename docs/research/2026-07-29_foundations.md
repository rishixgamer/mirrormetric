# Technical foundations — 2026-07-29

This note records the evidence behind the first architecture. It is not a claim
that the prototype is already validated.

## Decision 1: start with on-device MediaPipe

Google's Web guide states that Face Landmarker returns 478 three-dimensional
landmarks and optional facial transformation matrices, and documents the
`@mediapipe/tasks-vision` browser package:

- https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
- https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker

The MediaPipe repository is Apache-2.0 licensed:

- https://github.com/google-ai-edge/mediapipe
- https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE

The official documentation labels the task a preview release. That makes it
appropriate for an adapter-backed prototype, not a permanent accuracy claim.

## Decision 2: keep an ONNX/WebGPU upgrade path

ONNX Runtime Web documents in-browser inference via WebAssembly and WebGPU,
including the privacy and offline benefits of keeping inference on-device:

- https://onnxruntime.ai/docs/tutorials/web/
- https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html

This path allows later use of profile-specific or uncertainty-aware open models
without changing the measurement contract.

## Decision 3: benchmark difficult conditions, not demos

The official WFLW project describes 10,000 faces, 98 manual landmarks, and
attribute subsets for pose, expression, illumination, make-up, occlusion, and
blur:

- https://wywu.github.io/projects/LAB/WFLW.html
- https://wywu.github.io/projects/LAB/support/LAB.pdf

Dataset access and redistribution terms must be reviewed separately before use.

## Decision 4: treat profile views as a separate problem

The 3DDFA paper explains why standard small/medium-pose alignment is not
sufficient near 90-degree profile views and evaluates a 3D approach:

- https://openaccess.thecvf.com/content_cvpr_2016/html/Zhu_Face_Alignment_Across_CVPR_2016_paper.html

MirrorMetric will not relabel a frontal detector as an accurate profile system.

## Decision 5: uncertainty is a first-class output

LUVLi jointly estimates landmark location, uncertainty, and visibility and
argues that uncertainty can identify inputs where alignment fails:

- https://openaccess.thecvf.com/content_CVPR_2020/html/Kumar_LUVLi_Face_Alignment_Estimating_Landmarks_Location_Uncertainty_and_Visibility_Likelihood_CVPR_2020_paper.html

The initial image-quality gate is only a precursor. Model-derived uncertainty
or repeated perturbation testing belongs in a validated release.

## Decision 6: audit performance across people and capture conditions

Recent and earlier research indicates that pose, resolution, age, and other
conditions can affect or confound landmark performance:

- https://arxiv.org/abs/2604.06961
- https://arxiv.org/abs/1905.07446

The project will publish conditioned error intervals and sample sizes rather
than a single fairness score.
