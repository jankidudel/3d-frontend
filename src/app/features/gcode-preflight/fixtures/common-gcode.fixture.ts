export const commonGcodeFixture = `; generated with Cura_SteamEngine 5.8
;TIME:3600
;Layer count:2
;Filament used:1.23m
; thumbnail begin 16x16
G21
G90
M82
G0 X0 Y0 Z0.2
G1 X10 Y0 E1
G1 X10 Y10 E2
G92 E0
G91
M83
G1 X1 Y1 Z0.2 E0.5
M104 S210
M109 S215
M140 S60
M190 S65`;
