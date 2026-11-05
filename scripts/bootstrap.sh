#!/usr/bin/env bash
set -euo pipefail

readonly REGION="us-east-2"
readonly DEPLOY_NAME="eds-github-deploy"

cd "$(dirname "${BASH_SOURCE[0]}")"

account_id="$(aws sts get-caller-identity --query Account --output text)"
bucket="eds-tfstate-${account_id}"
policy_arn="arn:aws:iam::${account_id}:policy/${DEPLOY_NAME}"

if ! aws s3api head-bucket --bucket "$bucket" --region "$REGION" >/dev/null 2>&1; then
  aws s3api create-bucket \
    --bucket "$bucket" \
    --region "$REGION" \
    --create-bucket-configuration "LocationConstraint=${REGION}" >/dev/null
fi
aws s3api put-bucket-versioning \
  --bucket "$bucket" \
  --region "$REGION" \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption \
  --bucket "$bucket" \
  --region "$REGION" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-public-access-block \
  --bucket "$bucket" \
  --region "$REGION" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

if ! aws iam get-user --user-name "$DEPLOY_NAME" >/dev/null 2>&1; then
  aws iam create-user --user-name "$DEPLOY_NAME" >/dev/null
fi

# Administrada porque una política en línea de usuario admite solo 2 048 caracteres.
if aws iam get-policy --policy-arn "$policy_arn" >/dev/null 2>&1; then
  # IAM admite 5 versiones por política y rechaza crear una sexta.
  old_versions="$(aws iam list-policy-versions \
    --policy-arn "$policy_arn" \
    --query 'Versions[?!IsDefaultVersion].VersionId' \
    --output text)"
  for version in $old_versions; do
    aws iam delete-policy-version --policy-arn "$policy_arn" --version-id "$version"
  done
  aws iam create-policy-version \
    --policy-arn "$policy_arn" \
    --policy-document file://deploy-policy.json \
    --set-as-default >/dev/null
else
  aws iam create-policy \
    --policy-name "$DEPLOY_NAME" \
    --policy-document file://deploy-policy.json >/dev/null
fi
aws iam attach-user-policy --user-name "$DEPLOY_NAME" --policy-arn "$policy_arn"

echo "Usuario de despliegue: ${DEPLOY_NAME}"
echo "Bucket de estado: ${bucket}"
