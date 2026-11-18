export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-button>Continue with email</helix-button>
      <helix-divider>OR</helix-divider>
      <helix-button>Continue with a passkey</helix-button>

      <helix-divider content-placement="start">Billing</helix-divider>
      <helix-divider content-placement="end">Shipping</helix-divider>
    </helix-flex>
  )
}
