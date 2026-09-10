# SPDX-License-Identifier: AGPL-3.0-only
"""Offline reference preparation; never imports the Worker or its calculation code."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
rows = {}
for line in (root / 'test/fixtures/case-f-after-native.txt').read_text(encoding='utf-8-sig').splitlines():
    parts = line.split(',')
    if len(parts) == 3:
        try:
            rows[parts[0].strip()] = [float(parts[1]), float(parts[2])]
        except ValueError:
            pass
names = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']
planets = {name.upper(): dict(longitude=rows[name][0], longitude_speed=rows[name][1]) for name in names}
# Independent table calculation from printed native longitudes. No production imports.
rules = [('CONJUNCTION',0,8),('SEXTILE',60,5),('SQUARE',90,7),('TRINE',120,7),('OPPOSITION',180,8)]
aspects = []
for i,a in enumerate(names):
    for b in names[i+1:]:
        distance = abs(rows[a][0]-rows[b][0])
        distance = min(distance,360-distance)
        matches = [name for name,angle,orb in rules if abs(distance-angle) <= orb]
        assert len(matches) <= 1
        aspects.append(dict(body_a=a.upper(),body_b=b.upper(),status='FORMED' if matches else 'NOT_FORMED',aspect=matches[0] if matches else None))
source = dict(NORMALIZED_BIRTH_DATE='2000-03-20',NORMALIZED_BIRTH_TIME='16:35:15',TIME_PRECISION='SECOND',LOCAL_CIVIL_DATETIME='2000-03-20T16:35:15',PLACE_NORMALIZED='Tokyo reference coordinate',LATITUDE=35.6762,LONGITUDE=139.6503,GEO_PRECISION='EXACT',GEO_STATUS='CONFIRMED',TIMEZONE_ID='Asia/Tokyo',TIMEZONE_STATUS='CONFIRMED',TZDB_VERSION='2026c',PRE_1970_CONFIDENCE=None,DST_STATUS='STANDARD',LOCAL_TIME_STATUS='NORMAL',UTC_OFFSET_EFFECTIVE='+09:00',UTC_DATETIME='2000-03-20T07:35:15Z',K02_AUDIT_STATUS='PASS',K02_VERSION='K02_v2.4_PRODUCTION')
fixture = dict(case_id='CASE_F_AFTER',input=source,reference=dict(engine='Swiss Ephemeris native swetest64',version='2.10.03',executable_sha256='C44D29554927AD1BA44196B5B274904F012DACAA3B4797F7F4AE6A48618FC1C5',data='@kuntay/swisseph-data@0.2.2',raw='case-f-after-native.txt',independence='Separate native executable; same Swiss Ephemeris engine family and data. Not independent astronomical model certification.'),tolerance=dict(longitude_degrees=0.01,angle_degrees=0.05,cusp_degrees=0.05,speed_degrees_per_day=0.000001),expected=dict(jd_ut=2451623.816145833,planets=planets,asc=rows['Ascendant'][0],mc=rows['MC'][0],cusps=[rows[f'house {i:2d}'][0] for i in range(1,13)],aspects=aspects))
fixture['expected']['sun_sign'] = 'ARIES'
(root/'test/fixtures/case-f-after.json').write_text(json.dumps(fixture,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
