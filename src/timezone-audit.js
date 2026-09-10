// SPDX-License-Identifier: AGPL-3.0-only
import process from 'node:process';
import {TZDB_VERSION,TZDB_HASH} from './fixed-timezone.js';
export function timezoneAudit(source,versions=process.versions) {
  const reported=typeof versions?.tz==='string'&&versions.tz.trim()?versions.tz:null;
  const declared=source?.TZDB_VERSION??null;
  return {audit_contract:'K08_TIMEZONE_EVIDENCE_v1',
    validation_data_version:TZDB_VERSION,validation_data_source:'moment-timezone@0.6.3/data/packed/latest.json',validation_data_sha256:TZDB_HASH,
    validation_data_comparison:!declared?'K02_VERSION_MISSING':declared===TZDB_VERSION?'PINNED_VERSION_MATCH':'PINNED_VERSION_MISMATCH',
    validation_data_integrity:'BUILD_HASH_CHECKED',
    k02_declared_version:declared,k02_version_source:'K02_INPUT_UNVERIFIED',
    runtime_reported_version:reported,runtime_version_source:reported?'node:process.versions.tz':null,
    runtime_reported_icu_version:typeof versions?.icu==='string'&&versions.icu.trim()?versions.icu:null,
    version_comparison:!declared?'K02_VERSION_MISSING':!reported?'RUNTIME_VERSION_UNAVAILABLE':declared===reported?'REPORTED_VERSIONS_MATCH':'REPORTED_VERSIONS_MISMATCH',
    k02_data_source_verified:false,runtime_data_source_verified:false,
    official_reference_url:'https://www.iana.org/time-zones',
    data_source_artifact:null,data_manifest_hash:null,
    timezone_certification_status:'UNVERIFIED',production_eligible:false,
    limitation:'Version strings and the official reference URL do not prove which timezone data was used.'};
}
