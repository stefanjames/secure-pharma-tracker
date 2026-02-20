import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Factory, Truck, FlaskConical, Shield } from "lucide-react";

const roles = [
  {
    title: "Manufacturer",
    icon: Factory,
    color: "emerald",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    abilities: [
      "Register new pharmaceutical batches",
      "Record drug metadata and timestamps",
      "Initiate shipments to logistics providers",
      "View full batch lifecycle history",
    ],
  },
  {
    title: "Logistics",
    icon: Truck,
    color: "yellow",
    gradient: "from-yellow-500/20 to-yellow-500/5",
    border: "border-yellow-500/20 hover:border-yellow-500/40",
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-400",
    abilities: [
      "Accept batch custody transfers",
      "Record temperature during transit",
      "Confirm deliveries to destinations",
      "Maintain chain-of-custody records",
    ],
  },
  {
    title: "QA Tester",
    icon: FlaskConical,
    color: "orange",
    gradient: "from-orange-500/20 to-orange-500/5",
    border: "border-orange-500/20 hover:border-orange-500/40",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    abilities: [
      "Initiate quality assurance testing",
      "Record test results on-chain",
      "Approve or reject batches",
      "Record temperature measurements",
    ],
  },
  {
    title: "Regulator",
    icon: Shield,
    color: "purple",
    gradient: "from-purple-500/20 to-purple-500/5",
    border: "border-purple-500/20 hover:border-purple-500/40",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    abilities: [
      "View all batches across the network",
      "Issue emergency batch recalls",
      "Audit full supply chain history",
      "Monitor compliance in real-time",
    ],
  },
];

export function RoleCards() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Built for Every Role
          </h2>
          <p className="mt-4 text-gray-400 max-w-xl mx-auto">
            Role-based access control ensures each participant sees exactly what
            they need
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative"
            >
              {/* Hover glow */}
              <div
                className={`absolute -inset-0.5 rounded-xl bg-gradient-to-b ${role.gradient} opacity-0 group-hover:opacity-100 blur-sm transition-opacity`}
              />

              <div
                className={`relative rounded-xl border ${role.border} bg-gray-900/80 backdrop-blur-sm p-6 h-full transition-colors`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${role.iconBg} flex items-center justify-center mb-4`}
                >
                  <role.icon className={`h-6 w-6 ${role.iconColor}`} />
                </div>

                <h3 className="text-lg font-bold mb-4">{role.title}</h3>

                <ul className="space-y-2.5">
                  {role.abilities.map((ability) => (
                    <li
                      key={ability}
                      className="flex items-start gap-2 text-sm text-gray-400"
                    >
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${role.iconBg} shrink-0`} />
                      {ability}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
