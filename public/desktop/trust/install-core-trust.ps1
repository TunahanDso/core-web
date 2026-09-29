# YTÜ CORE Internal Trust Installer
# Installs the public CORE Root CA and Desktop signer for the current Windows user.
# No private key is included in this script or downloaded to the device.

$ErrorActionPreference = "Stop"
$base = "https://ytucore.com/desktop/trust"
$temp = Join-Path $env:TEMP "ytucore-trust"
New-Item -ItemType Directory -Force -Path $temp | Out-Null

$root = Join-Path $temp "YTU-CORE-Internal-Root-CA.cer"
$signer = Join-Path $temp "YTU-CORE-Desktop-Code-Signing.cer"

Invoke-WebRequest "$base/YTU-CORE-Internal-Root-CA.cer" -OutFile $root
Invoke-WebRequest "$base/YTU-CORE-Desktop-Code-Signing.cer" -OutFile $signer

$rootExpected = "7226F05A9067F31905277A93215C2BCE623E2DEFB382E98CBE65A74E69A9A295"
$signerExpected = "761EFDF03090D7EE30B3B11F1AE5DEA16F285D99C81CA6170A7EC528A4DCF2B5"

$rootCert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($root)
$signerCert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($signer)
$sha256 = [System.Security.Cryptography.HashAlgorithmName]::SHA256
$rootActual = $rootCert.GetCertHashString($sha256)
$signerActual = $signerCert.GetCertHashString($sha256)

if ($rootActual -ne $rootExpected) { throw "CORE Root CA fingerprint mismatch." }
if ($signerActual -ne $signerExpected) { throw "CORE Desktop signer fingerprint mismatch." }

certutil -user -addstore -f Root $root | Out-Host
certutil -user -addstore -f TrustedPublisher $signer | Out-Host

Write-Host ""
Write-Host "YTÜ CORE internal trust installed for the current Windows user."
Write-Host "Root:   $rootExpected"
Write-Host "Signer: $signerExpected"
