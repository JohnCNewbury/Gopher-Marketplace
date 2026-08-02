VERDICT: ADAPT — the worker's active-work list over live order state.

BEHAVIOUR
- Active/accepted requests with stage chips; taps into job detail / in-job flow.
- Availability toggle ("Available for work") affects broadcast inclusion.

ENDPOINTS / BACKEND SEAMS
- Orders read scoped to this worker; state comes from the (to-be-formalized) order
  state machine — live has NO state machine (aasm_state is a plain string with ad-hoc
  updates); the rebuild formalizes states without renaming them.
