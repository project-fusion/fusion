export function Example() {
  return (
    <helix-listbox
      default-value="sun"
      label="Cover photo"
      layout="grid"
      name="cover"
    >
      <helix-option value="ocean">
        <img
          alt=""
          slot="media"
          src="/media/scale/ocean-sun.jpg"
        />
        Ocean at dusk
      </helix-option>
      <helix-option value="seawater">
        <img
          alt=""
          slot="media"
          src="/media/scale/seawater-400.jpg"
        />
        Seawater
      </helix-option>
      <helix-option value="sun">
        <img
          alt=""
          slot="media"
          src="/media/scale/sun.jpg"
        />
        Sun
      </helix-option>
    </helix-listbox>
  )
}
