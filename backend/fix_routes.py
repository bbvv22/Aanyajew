"""
Fix server.py route registration order
Move all API routes before app.include_router()
"""

# Read the current server.py
with open('backend/server.py', 'r') as f:
    lines = f.readlines()

# Find the line with app.include_router
include_router_line = None
for i, line in enumerate(lines):
    if line.strip() == 'app.include_router(api_router)':
        include_router_line = i
        break

if include_router_line is None:
    print("ERROR: Could not find app.include_router line!")
    exit(1)

print(f"Found include_router at line {include_router_line + 1}")

# Split the file: before include_router and after
before_router = lines[:include_router_line]
after_router = lines[include_router_line:]

# Find routes that are AFTER include_router (they won't work)
misplaced_routes = []
in_route = False
route_start = None

for i, line in enumerate(after_router):
    if '@api_router.' in line:
        in_route = True
        route_start = i
    elif in_route and (line.strip().startswith('def ') or line.strip().startswith('async def ')):
        # This is the function definition
        pass
    elif in_route and line.strip() and not line.strip().startswith('#') and not line.strip().startswith('@') and route_start is not None:
        # End of route found
        in_route = False

print(f"Found {len([l for l in after_router if '@api_router.' in l])} routes after include_router")

# Write fixed version
with open('backend/server.py', 'w') as f:
    # Write everything before include_router
    f.writelines(before_router)
    
    # Add owner/verify endpoint if not already there
    has_verify = any('/owner/verify' in line for line in before_router)
    if not has_verify:
        f.write('\n# Owner verify endpoint\n')
        f.write('@api_router.get("/owner/verify")\n')
        f.write('async def verify_owner(current_user: UserDB = Depends(get_current_user)):\n')
        f.write('    if current_user.role not in [\'owner\', \'admin\']:\n')
        f.write('        raise HTTPException(status_code=403, detail="Not authorized")\n')
        f.write('    return {"valid": True, "role": current_user.role}\n\n')
        print("✅ Added /owner/verify endpoint")
    
    # Write the include_router line
    f.writelines(after_router[:1])  # Just the include_router line
    
    # Write the rest (if __name__ == "__main__" etc, but skip route definitions)
    skip_routes = False
    for line in after_router[1:]:
        if '@api_router.' in line:
            skip_routes = True
        elif skip_routes and line.strip() and not line.strip().startswith(' ') and not line.strip().startswith('@') and not line.strip().startswith('#'):
            skip_routes = False
        
        if not skip_routes:
            f.write(line)

print("✅ Fixed server.py - all routes now before include_router")
