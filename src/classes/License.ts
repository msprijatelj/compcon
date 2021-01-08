import { store } from '@/store'
import _ from 'lodash'
import { LicensedItem, Frame, Manufacturer, Pilot } from '@/class'

class License {
  public readonly Name: string
  public readonly Source: string
  public readonly FrameID: string
  public readonly Brew: string
  public readonly Unlocks: LicensedItem[][]
  public readonly Specialty: boolean
  public readonly Prerequisite?: { source: string; min_rank: number; cumulative?: boolean }

  public constructor(frame: Frame) {
    this.Name = frame.Name
    this.Source = frame.Source
    this.FrameID = frame.ID
    this.Brew = frame.Brew || 'Core'

    const items: LicensedItem[] = _.cloneDeep(store.getters.getItemCollection('MechWeapons'))
      .concat(
        store.getters.getItemCollection('WeaponMods'),
        store.getters.getItemCollection('MechSystems')
      )
      .filter((x: LicensedItem) => x.License.toUpperCase() === frame.Name.toUpperCase())

    this.Unlocks = new Array<LicensedItem[]>(Math.max(...items.map(i => i.LicenseLevel))).fill([])

    for (let i = 0; i < this.Unlocks.length; i++) {
      this.Unlocks[i] = items.filter(x => x.LicenseLevel === i + 1)
    }

    this.Specialty = !!frame.Specialty
    if (typeof frame.Specialty !== 'boolean') {
      this.Prerequisite = frame.Specialty
    }

    if (frame.LicenseLevel && !this.Specialty) this.Unlocks[frame.LicenseLevel - 1].unshift(frame)
  }

  public CanSelect(pilot: Pilot): boolean {
    if (!pilot.IsMissingLicenses) return false
    if (!this.Specialty || !this.Prerequisite) return true
    if (this.Prerequisite.cumulative) {
      const rankTotal = pilot.Licenses.filter(
        x => x.License.Source === this.Prerequisite.source && x.Rank
      ).reduce((a, b) => +a + +b.Rank, 0)
      return rankTotal >= this.Prerequisite.min_rank
    }
    return pilot.Licenses.some(
      x => x.License.Source === this.Prerequisite.source && x.Rank >= this.Prerequisite.min_rank
    )
  }

  public get Manufacturer(): Manufacturer {
    return store.getters.referenceByID('Manufacturers', this.Source)
  }

  public get MaxRank(): number {
    return this.Unlocks.length
  }

  public UnlockByRank(rank: number): LicensedItem[] {
    return this.Unlocks[rank - 1]
  }

  public ToString(): string {
    return `${this.Source} ${this.Name}`
  }

  public static Deserialize(frameId: string): License {
    return new License(store.getters.referenceByID('Frames', frameId))
  }
}

export default License
