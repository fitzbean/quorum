Original prompt: Add a clone button to each participant in the panel, which will create another instance of that type of panel member

- Added a participant clone handler in `src/App.tsx` that duplicates the selected panel member into the next numbered instance while preserving its current configuration.
- TODO: Verify the roster action layout still works cleanly at narrow sidebar widths after adding the new control.
