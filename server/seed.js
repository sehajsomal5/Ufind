import bcrypt from 'bcryptjs'
import { User } from './models/User.js'
import { Item } from './models/Item.js'

export async function seedInitialData() {
  try {
    // 1. Seed Admin user securely
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@ufind.edu').trim().toLowerCase()
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin#UFind2026!'
    const adminName = process.env.ADMIN_NAME || 'Campus Administrator'

    const existingAdmin = await User.findOne({ email: adminEmail })
    const salt = await bcrypt.genSalt(10)
    const newHash = await bcrypt.hash(adminPassword, salt)

    if (!existingAdmin) {
      await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash: newHash,
        college: 'UFind Central Campus',
        role: 'admin',
      })
      console.log(`[Seed] Provisioned default administrator account: ${adminEmail}`)
    } else {
      existingAdmin.name = adminName
      existingAdmin.role = 'admin'
      existingAdmin.passwordHash = newHash
      await existingAdmin.save()
      console.log(`[Seed] Synchronized administrator account credentials for: ${adminEmail}`)
    }

    // 2. Update existing sample items
    await Item.updateOne(
      { title: 'Wireless Earbuds', isSample: true },
      { $set: { status: 'recovered' } }
    )

    await Item.updateOne(
      { title: 'Student ID Card', isSample: true },
      { $set: { type: 'found', status: 'found' } }
    )

    console.log('[Seed] Updated Wireless Earbuds and Student ID Card statuses.')

    // 3. Seed sample items only if none exist
    const sampleCount = await Item.countDocuments({ isSample: true })

    if (sampleCount === 0) {
      const sampleItems = [
        {
          title: 'Black Wallet',
          type: 'found',
          status: 'found',
          category: 'Accessories',
          description: 'A black leather bi-fold wallet found near the library entrance. Contains some cards but no cash visible.',
          location: 'Library',
          date: '2026-10-19',
          reportedBy: 'Campus Staff',
          contactHint: 'Describe the contents to verify ownership.',
          isSample: true,
          imageUrl: '/images/blackWallet.png',
        },
        {
          title: 'Student ID Card',
          type: 'found',
          status: 'found',
          category: 'ID Cards',
          description: 'Lost my college ID card somewhere in or around the cafeteria during lunch. Has photo and roll number.',
          location: 'Cafeteria',
          date: '2026-10-20',
          reportedBy: 'Demo Student',
          contactHint: 'Contact if found. Will describe card details.',
          isSample: true,
          imageUrl: '/images/idCard.jpg',
        },
        {
          title: 'Blue Water Bottle',
          type: 'found',
          status: 'found',
          category: 'Accessories',
          description: 'A blue metal water bottle with a white screw cap, found on a desk in Room 204.',
          location: 'Classroom Block A',
          date: '2026-10-18',
          reportedBy: 'Class Rep',
          contactHint: 'Identify bottle capacity to claim.',
          isSample: true,
          imageUrl: '/images/blueBottle.jpg',
        },
        {
          title: 'Laptop Charger',
          type: 'found',
          status: 'found',
          category: 'Electronics',
          description: 'A 65W USB-C laptop charger found on a study table near the reading section on the second floor of the library. Works with MacBook, Dell, and other USB-C laptops.',
          location: 'Library',
          date: '2026-10-20',
          reportedBy: 'Anonymous Student',
          contactHint: 'Mention the brand and wattage to claim.',
          isSample: true,
          imageUrl: '/images/charger.jpeg',
        },
        {
          title: 'Wireless Earbuds',
          type: 'lost',
          status: 'recovered',
          category: 'Electronics',
          description: 'Lost my white wireless earbuds and their charging case near the auditorium seating area after the evening event.',
          location: 'Auditorium',
          date: '2026-10-17',
          reportedBy: 'Anonymous Student',
          contactHint: 'Describe the brand and case colour to claim.',
          isSample: true,
          imageUrl: '/images/earBuds.jpeg',
        },
        {
          title: 'Keychain with Keys',
          type: 'lost',
          status: 'recovered',
          category: 'Keys',
          description: 'Lost a keychain with three keys and a small teddy bear charm near the hostel main entrance. Keys recovered — thank you!',
          location: 'Hostel',
          date: '2026-10-15',
          reportedBy: 'Demo Student',
          contactHint: 'Item has been recovered.',
          isSample: true,
          imageUrl: '/images/keys.jpg',
        },
      ]

      await Item.insertMany(sampleItems)
      console.log('[Seed] Populated sample reference items (isSample: true).')
    }
  } catch (error) {
    console.error('[Seed] Initialization error:', error.message)
  }
}